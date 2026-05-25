import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Anti-sniping: if a bid lands within this window, reset end_time to this many ms from now
const SNIPE_WINDOW_MS   = 15_000   // < 15s remaining triggers the reset
const SNIPE_FLOOR_MS    = 15_000   // reset end_time to now + 15s
const MIN_INCREMENT_CENTS = 100    // bids must be at least $1 above current

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { auction_id?: string; amount?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { auction_id, amount } = body

  if (!auction_id || typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'auction_id and integer amount (cents) are required' }, { status: 400 })
  }

  const db = getServiceDb()

  // ── Fetch auction + listing ───────────────────────────────────────────────
  const { data: auction, error: auctionError } = await db
    .from('auctions')
    .select('*, listing:listings!inner(seller_id, status)')
    .eq('id', auction_id)
    .single()

  if (auctionError || !auction) {
    return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  }

  const listing = auction.listing as { seller_id: string; status: string }

  // ── Validations ───────────────────────────────────────────────────────────
  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'This auction is no longer active' }, { status: 400 })
  }

  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: 'You cannot bid on your own auction' }, { status: 400 })
  }

  if (auction.high_bidder_id === user.id) {
    return NextResponse.json({ error: 'You are already the highest bidder' }, { status: 400 })
  }

  const now = Date.now()
  const endTime = new Date(auction.end_time).getTime()

  if (endTime <= now) {
    return NextResponse.json({ error: 'This auction has already ended' }, { status: 400 })
  }

  const minBid = auction.current_bid + MIN_INCREMENT_CENTS
  if (amount < minBid) {
    return NextResponse.json({
      error: `Bid must be at least $${(minBid / 100).toFixed(2)}`,
      min_bid: minBid,
    }, { status: 400 })
  }

  // ── Insert bid record ─────────────────────────────────────────────────────
  const { error: bidError } = await db
    .from('bids')
    .insert({ auction_id, bidder_id: user.id, amount })

  if (bidError) {
    return NextResponse.json({ error: bidError.message }, { status: 500 })
  }

  // ── Anti-sniping: reset end_time to floor if bid lands in final window ────
  const msRemaining = endTime - now
  const sniped = msRemaining < SNIPE_WINDOW_MS
  const newEndTime = sniped
    ? new Date(now + SNIPE_FLOOR_MS).toISOString()
    : auction.end_time

  // ── Update auction ────────────────────────────────────────────────────────
  const { error: updateError } = await db
    .from('auctions')
    .update({
      current_bid:    amount,
      bid_count:      auction.bid_count + 1,
      high_bidder_id: user.id,
      end_time:       newEndTime,
    })
    .eq('id', auction_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      bid_placed:  amount,
      end_time:    newEndTime,
      bid_count:   auction.bid_count + 1,
      sniped,
    },
  })
}
