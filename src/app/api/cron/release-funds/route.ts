import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPayoutReleased, sendShippingReminder } from '@/lib/resend'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceDb()
  const now = new Date()
  let released = 0
  let cancelled = 0
  const errors: string[] = []

  // ── 1. Release payouts ────────────────────────────────────────────────────
  // Only for shipped/delivered orders past their auto_confirm_at.
  // awaiting_shipment is explicitly excluded — payout requires tracking number.
  const { data: readyOrders } = await db
    .from('orders')
    .select('id, seller_id, seller_payout_cents, listing_id')
    .lte('auto_confirm_at', now.toISOString())
    .eq('transfer_released', false)
    .in('status', ['shipped', 'delivered'])
    .not('seller_payout_cents', 'is', null)

  for (const order of readyOrders ?? []) {
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', order.seller_id)
        .single()

      if (!profile?.stripe_onboarding_complete || !profile.stripe_account_id) {
        errors.push(`Order ${order.id}: seller not onboarded`)
        continue
      }

      const transfer = await stripe.transfers.create({
        amount: order.seller_payout_cents,
        currency: 'usd',
        destination: profile.stripe_account_id,
        metadata: { order_id: order.id },
      })

      await db.from('orders').update({
        transfer_released: true,
        transfer_id: transfer.id,
        status: 'complete',
        updated_at: now.toISOString(),
      }).eq('id', order.id)

      released++

      void (async () => {
        try {
          const [{ data: l }, { data: authData }] = await Promise.all([
            db.from('listings').select('coin_name').eq('id', order.listing_id).single(),
            db.auth.admin.getUserById(order.seller_id),
          ])
          const email = authData.user?.email
          if (email) {
            await sendPayoutReleased({
              to: email,
              sellerName: email.split('@')[0],
              listingTitle: l?.coin_name ?? 'your listing',
              payoutCents: order.seller_payout_cents,
            })
          }
        } catch { /* non-critical */ }
      })()
    } catch (err) {
      errors.push(`Order ${order.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── 2. Auto-cancel unshipped orders after 5 days ──────────────────────────
  // Seller forfeits: listing stays expired, counts toward their monthly limit.
  // Buyer is fully refunded. No auto-relist.
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400_000).toISOString()
  const { data: staleOrders } = await db
    .from('orders')
    .select('id, buyer_id, seller_id, listing_id, stripe_payment_intent_id')
    .eq('status', 'awaiting_shipment')
    .lt('created_at', fiveDaysAgo)

  for (const order of staleOrders ?? []) {
    try {
      // Refund buyer via Stripe
      if (order.stripe_payment_intent_id) {
        await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
      }

      await Promise.all([
        db.from('orders').update({
          status: 'cancelled',
          updated_at: now.toISOString(),
        }).eq('id', order.id),
        // Expire the listing — seller can manually relist (counts toward their monthly limit)
        db.from('listings').update({
          status: 'expired',
          updated_at: now.toISOString(),
        }).eq('id', order.listing_id),
      ])

      cancelled++
    } catch (err) {
      errors.push(`Cancel order ${order.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ── 3. Shipping reminders at day 3 ───────────────────────────────────────
  // Window: 3 days to 3 days+1hr ago — catches each order exactly once per hourly run
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000).toISOString()
  const threeDaysOneHourAgo = new Date(now.getTime() - 3 * 86400_000 - 3600_000).toISOString()

  const { data: unshipped } = await db
    .from('orders')
    .select('id, seller_id, listing_id')
    .eq('status', 'awaiting_shipment')
    .lt('created_at', threeDaysAgo)
    .gt('created_at', threeDaysOneHourAgo)

  for (const order of unshipped ?? []) {
    void (async () => {
      try {
        const [{ data: sellerAuth }, { data: listing }] = await Promise.all([
          db.auth.admin.getUserById(order.seller_id),
          db.from('listings').select('coin_name').eq('id', order.listing_id).single(),
        ])
        const email = sellerAuth.user?.email
        if (email) {
          await sendShippingReminder({
            to: email,
            sellerName: email.split('@')[0],
            listingTitle: listing?.coin_name ?? 'your order',
            orderId: order.id,
          })
        }
      } catch { /* non-critical */ }
    })()
  }

  return NextResponse.json({ released, cancelled, errors })
}
