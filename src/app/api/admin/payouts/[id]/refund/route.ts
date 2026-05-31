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
    .select('id, amount, stripe_payment_intent_id, transfer_released, status')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.transfer_released) return NextResponse.json({ error: 'Funds already released to seller. Cannot refund.' }, { status: 409 })
  if (!order.stripe_payment_intent_id) return NextResponse.json({ error: 'No payment intent on record' }, { status: 400 })

  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id,
    metadata: { order_id: order.id, refunded_by: user!.id, manual: 'true' },
  })

  await db.from('orders').update({
    status: 'complete',
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await logAdminAction(user!.id, 'manual_refund', 'order', id, {
    refund_id: refund.id,
    amount_cents: order.amount,
  })

  return NextResponse.json({ ok: true, refund_id: refund.id })
}
