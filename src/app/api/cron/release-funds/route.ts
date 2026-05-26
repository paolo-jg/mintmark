import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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
      // Fetch seller's Stripe account
      const { data: profile } = await db
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', order.seller_id)
        .single()

      if (!profile?.stripe_onboarding_complete || !profile.stripe_account_id) {
        errors.push(`Order ${order.id}: seller not onboarded`)
        continue
      }

      // Fire transfer to seller
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Order ${order.id}: ${msg}`)
    }
  }

  return NextResponse.json({ released, errors })
}
