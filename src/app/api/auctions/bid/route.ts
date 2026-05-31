import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SNIPE_WINDOW_MS    = 15_000
const SNIPE_FLOOR_MS     = 15_000
const MIN_INCREMENT_CENTS = 100

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { auction_id?: string; amount?: number }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { auction_id, amount } = body
  if (!auction_id || typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'auction_id and integer amount (cents) are required' }, { status: 400 })
  }

  const db = getServiceDb()

  const { data: auction, error: auctionError } = await db
    .from('auctions')
    .select('*, listing:listings!inner(seller_id, status, title, coin_name)')
    .eq('id', auction_id)
    .single()

  if (auctionError || !auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })

  const listing = auction.listing as { seller_id: string; status: string; title: string; coin_name: string | null }

  if (listing.status !== 'active') return NextResponse.json({ error: 'This auction is no longer active' }, { status: 400 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'You cannot bid on your own auction' }, { status: 400 })
  if (auction.high_bidder_id === user.id) return NextResponse.json({ error: 'You are already the highest bidder' }, { status: 400 })

  const now = Date.now()
  const endTime = new Date(auction.end_time).getTime()
  if (endTime <= now) return NextResponse.json({ error: 'This auction has already ended' }, { status: 400 })

  const minBid = auction.current_bid + MIN_INCREMENT_CENTS
  if (amount < minBid) {
    return NextResponse.json({ error: `Bid must be at least $${(minBid / 100).toFixed(2)}`, min_bid: minBid }, { status: 400 })
  }

  // ── Require saved Stripe payment method ───────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = profile?.stripe_customer_id as string | null
  if (!customerId) {
    return NextResponse.json({ error: 'no_payment_method', message: 'Please add a payment method before bidding.' }, { status: 402 })
  }

  // Get the customer's default payment method
  const customer = await stripe.customers.retrieve(customerId) as { deleted?: boolean; invoice_settings?: { default_payment_method?: string | { id: string } | null }; default_source?: string | null }
  if (customer.deleted) {
    return NextResponse.json({ error: 'no_payment_method', message: 'Please add a payment method before bidding.' }, { status: 402 })
  }

  const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
  if (!paymentMethods.data.length) {
    return NextResponse.json({ error: 'no_payment_method', message: 'Please add a payment method before bidding.' }, { status: 402 })
  }
  const paymentMethodId = paymentMethods.data[0].id

  // ── Cancel the previous high bidder's hold (if any) ───────────────────────
  if (auction.high_bidder_id) {
    const { data: prevBid } = await db
      .from('bids')
      .select('id, stripe_payment_intent_id')
      .eq('auction_id', auction_id)
      .eq('bidder_id', auction.high_bidder_id)
      .eq('hold_status', 'held')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (prevBid?.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(prevBid.stripe_payment_intent_id)
        await db.from('bids').update({ hold_status: 'cancelled' }).eq('id', prevBid.id)
      } catch {
        // Non-fatal - hold may have already expired
      }
    }
  }

  // ── Place authorization hold for this bidder ──────────────────────────────
  let paymentIntentId: string | null = null
  let holdStatus: 'held' | 'failed' = 'held'

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      capture_method: 'manual',
      confirm: true,
      off_session: true,
      description: `Auction hold: ${listing.coin_name ?? listing.title}`,
      metadata: { auction_id, bidder_id: user.id },
    })
    paymentIntentId = pi.id
  } catch {
    holdStatus = 'failed'
    // Still record the bid but mark hold as failed - admin can decide how to handle
  }

  // ── Insert bid record ─────────────────────────────────────────────────────
  const { error: bidError } = await db
    .from('bids')
    .insert({
      auction_id,
      bidder_id: user.id,
      amount,
      stripe_payment_intent_id: paymentIntentId,
      hold_status: holdStatus,
    })

  if (bidError) {
    // If we placed a hold but can't record the bid, cancel the hold to avoid charging
    if (paymentIntentId) {
      await stripe.paymentIntents.cancel(paymentIntentId).catch(() => null)
    }
    return NextResponse.json({ error: bidError.message }, { status: 500 })
  }

  if (holdStatus === 'failed') {
    return NextResponse.json({ error: 'Your payment method could not be authorized. Please update your card.' }, { status: 402 })
  }

  // ── Anti-sniping ──────────────────────────────────────────────────────────
  const msRemaining = endTime - now
  const sniped = msRemaining < SNIPE_WINDOW_MS
  const newEndTime = sniped ? new Date(now + SNIPE_FLOOR_MS).toISOString() : auction.end_time

  // ── Update auction ────────────────────────────────────────────────────────
  const { error: updateError } = await db
    .from('auctions')
    .update({ current_bid: amount, bid_count: auction.bid_count + 1, high_bidder_id: user.id, end_time: newEndTime })
    .eq('id', auction_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ data: { bid_placed: amount, end_time: newEndTime, bid_count: auction.bid_count + 1, sniped } })
}
