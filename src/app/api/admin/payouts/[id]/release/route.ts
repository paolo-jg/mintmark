import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb, logAdminAction } from '@/lib/admin'
import stripe from '@/lib/stripe'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const db = getServiceDb()

  const { data: order } = await db
    .from('orders')
    .select('id, seller_id, seller_payout_cents, stripe_payment_intent_id, transfer_released, status')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.transfer_released) return NextResponse.json({ error: 'Already released' }, { status: 409 })
  if (!order.seller_payout_cents) return NextResponse.json({ error: 'No payout amount set' }, { status: 400 })

  const { data: sellerProfile } = await db
    .from('profiles')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', order.seller_id)
    .single()

  if (!sellerProfile?.stripe_onboarding_complete || !sellerProfile.stripe_account_id) {
    return NextResponse.json({ error: 'Seller Stripe account not ready' }, { status: 400 })
  }

  const transfer = await stripe.transfers.create({
    amount: order.seller_payout_cents,
    currency: 'usd',
    destination: sellerProfile.stripe_account_id,
    metadata: { order_id: order.id, released_by: user!.id, manual: 'true' },
  })

  await db.from('orders').update({
    transfer_released: true,
    transfer_id: transfer.id,
    status: 'complete',
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await logAdminAction(user!.id, 'manual_release', 'order', id, {
    transfer_id: transfer.id,
    amount_cents: order.seller_payout_cents,
  })

  return NextResponse.json({ ok: true, transfer_id: transfer.id })
}
