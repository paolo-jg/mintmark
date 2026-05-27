import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Runs every minute via Vercel Cron.
// Finds auctions past their end_time, captures the winning bid, cancels all other holds, creates the order.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceDb()

  // Find auctions that are past end_time but still active
  const { data: auctions } = await db
    .from('auctions')
    .select('*, listing:listings!inner(id, title, coin_name, seller_id, status, price, grading_service, grade, cert_number, year, mint_mark, denomination, series_slug, price_row_label, shipping_type, shipping_price_cents)')
    .eq('status', 'active')
    .lte('end_time', new Date().toISOString())

  if (!auctions?.length) return NextResponse.json({ settled: 0 })

  let settled = 0
  const errors: string[] = []

  for (const auction of auctions) {
    try {
      // Mark ended immediately to prevent double-processing
      await db.from('auctions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', auction.id)

      const listing = auction.listing as {
        id: string; title: string; coin_name: string | null; seller_id: string; status: string
        price: number | null; grading_service: string | null; grade: string | null; cert_number: string | null
        year: number | null; mint_mark: string | null; denomination: string | null; series_slug: string | null
        price_row_label: string | null; shipping_type: string | null; shipping_price_cents: number | null
      }

      // No bids or reserve not met — relist
      const reserveMet = !auction.reserve_price || auction.current_bid >= auction.reserve_price
      if (!auction.high_bidder_id || !reserveMet) {
        await db.from('auctions').update({ status: 'cancelled' }).eq('id', auction.id)
        // Cancel all holds (there may be bids even if reserve not met)
        await cancelAllHolds(db, auction.id)
        continue
      }

      // Find the winning bid
      const { data: winBid } = await db
        .from('bids')
        .select('id, stripe_payment_intent_id, hold_status')
        .eq('auction_id', auction.id)
        .eq('bidder_id', auction.high_bidder_id)
        .eq('hold_status', 'held')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!winBid?.stripe_payment_intent_id) {
        // No valid hold — cancel all, mark auction cancelled
        await db.from('auctions').update({ status: 'cancelled' }).eq('id', auction.id)
        await cancelAllHolds(db, auction.id)
        errors.push(`Auction ${auction.id}: no valid hold for winner`)
        continue
      }

      // Fetch seller profile for payout details
      const { data: sellerProfile } = await db
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete, subscription_tier')
        .eq('id', listing.seller_id)
        .single()

      const sellerFeeRate = sellerProfile?.subscription_tier === 'dealer' ? 0.00
        : sellerProfile?.subscription_tier === 'collector_premium' ? 0.019 : 0.07

      const shippingCents = listing.shipping_type === 'flat' && listing.shipping_price_cents
        ? listing.shipping_price_cents : 0

      const sellerPayoutCents = Math.round(auction.current_bid * (1 - sellerFeeRate)) + shippingCents

      // Capture the winning hold
      await stripe.paymentIntents.capture(winBid.stripe_payment_intent_id)
      await db.from('bids').update({ hold_status: 'captured' }).eq('id', winBid.id)

      // Create the order
      const { data: order } = await db.from('orders').insert({
        listing_id: listing.id,
        buyer_id: auction.high_bidder_id,
        seller_id: listing.seller_id,
        amount: auction.current_bid,
        seller_payout_cents: sellerPayoutCents,
        shipping_price_cents: shippingCents,
        status: 'awaiting_shipment',
        stripe_payment_intent_id: winBid.stripe_payment_intent_id,
      }).select('id').single()

      // Mark listing sold, mark auction settled
      await Promise.all([
        db.from('listings').update({ status: 'sold' }).eq('id', listing.id),
        db.from('auctions').update({ status: 'settled' }).eq('id', auction.id),
      ])

      // Record price history
      if (listing.coin_name && listing.grade && listing.grading_service) {
        await db.from('price_history').insert({
          coin_name: listing.coin_name,
          year: listing.year,
          mint_mark: listing.mint_mark,
          denomination: listing.denomination,
          grading_service: listing.grading_service,
          grade: listing.grade,
          series_slug: listing.series_slug,
          sale_price: auction.current_bid,
          sale_date: new Date().toISOString(),
          listing_id: listing.id,
        }).then(() => null, () => null)
      }

      // Cancel all other holds
      await cancelAllHolds(db, auction.id, winBid.id)

      settled++
      void order // suppress unused warning
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Auction ${auction.id}: ${msg}`)
      // Try to reset to ended so we can retry
      await db.from('auctions').update({ status: 'ended' }).eq('id', auction.id).then(() => null, () => null)
    }
  }

  return NextResponse.json({ settled, errors })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cancelAllHolds(
  db: SupabaseClient<any>,
  auctionId: string,
  exceptBidId?: string
) {
  const query = db
    .from('bids')
    .select('id, stripe_payment_intent_id')
    .eq('auction_id', auctionId)
    .eq('hold_status', 'held')

  const { data: bids } = await (exceptBidId ? query.neq('id', exceptBidId) : query)

  for (const bid of bids ?? []) {
    if (bid.stripe_payment_intent_id) {
      await stripe.paymentIntents.cancel(bid.stripe_payment_intent_id).catch(() => null)
    }
    await db.from('bids').update({ hold_status: 'cancelled' }).eq('id', bid.id).then(() => null, () => null)
  }
}
