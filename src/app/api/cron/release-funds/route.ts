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

  // Find orders ready for release: auto_confirm_at passed, not yet released, not disputed
  const { data: orders } = await db
    .from('orders')
    .select('id, seller_id, seller_payout_cents, stripe_payment_intent_id')
    .lte('auto_confirm_at', new Date().toISOString())
    .eq('transfer_released', false)
    .not('status', 'eq', 'disputed')
    .not('status', 'eq', 'complete')
    .not('seller_payout_cents', 'is', null)

  if (!orders?.length) {
    return NextResponse.json({ released: 0 })
  }

  let released = 0
  const errors: string[] = []

  for (const order of orders) {
    try {
      const [{ data: profile }, { data: listing }] = await Promise.all([
        db.from('profiles').select('stripe_account_id, stripe_onboarding_complete').eq('id', order.seller_id).single(),
        db.from('orders').select('listing_id').eq('id', order.id).single(),
      ])

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

      await db
        .from('orders')
        .update({
          transfer_released: true,
          transfer_id: transfer.id,
          status: 'complete',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      released++

      // Fire-and-forget payout email
      if (listing?.listing_id) {
        void Promise.all([
          db.from('listings').select('coin_name').eq('id', listing.listing_id).single(),
          db.auth.admin.getUserById(order.seller_id),
        ]).then(([{ data: l }, { data: authData }]) => {
          const email = authData.user?.email
          if (email) {
            return sendPayoutReleased({
              to: email,
              sellerName: email.split('@')[0],
              listingTitle: l?.coin_name ?? 'your listing',
              payoutCents: order.seller_payout_cents,
            })
          }
        }).catch(() => null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Order ${order.id}: ${msg}`)
    }
  }

  // Send shipping reminders for orders unshipped after 3 days
  // created_at window: between 3 days and 3 days+1hr ago — catches each order exactly once per hourly cron
  const { data: unshipped } = await db
    .from('orders')
    .select('id, seller_id, listing_id')
    .eq('status', 'awaiting_shipment')
    .lt('created_at', new Date(Date.now() - 3 * 86400000).toISOString())
    .gt('created_at', new Date(Date.now() - 3 * 86400000 - 3600000).toISOString())

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

  return NextResponse.json({ released, errors })
}
