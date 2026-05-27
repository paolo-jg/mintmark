import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb, logAdminAction } from '@/lib/admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-04-30.basil' })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { data, error: dbError } = await db
    .from('returns')
    .select(`
      *,
      filed_by_profile:profiles!returns_filed_by_fkey(id, email, username),
      resolved_by_profile:profiles!returns_resolved_by_fkey(email, username),
      order:orders!returns_order_id_fkey(
        id, amount, status, created_at,
        buyer:profiles!orders_buyer_id_fkey(id, email, username),
        seller:profiles!orders_seller_id_fkey(id, email, username),
        listing:listings!orders_listing_id_fkey(id, title, coin_name, images, grade, grading_service)
      )
    `)
    .eq('id', id)
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json() as {
    status?: string
    admin_notes?: string
    refund_amount_cents?: number
    issue_refund?: boolean
  }

  const db = getServiceDb()

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) {
    update.status = body.status
    if (['approved', 'label_sent', 'received', 'refunded', 'rejected', 'closed'].includes(body.status)) {
      update.resolved_by = user!.id
      update.resolved_at = new Date().toISOString()
    }
  }
  if (body.admin_notes !== undefined) update.admin_notes = body.admin_notes
  if (body.refund_amount_cents !== undefined) update.refund_amount_cents = body.refund_amount_cents

  // If issuing a refund via Stripe
  if (body.issue_refund && body.refund_amount_cents && body.refund_amount_cents > 0) {
    const { data: ret } = await db.from('returns').select('order_id').eq('id', id).single()
    if (ret) {
      const { data: order } = await db
        .from('orders')
        .select('transaction_id')
        .eq('id', ret.order_id)
        .single()

      if (order?.transaction_id) {
        // Look up the Stripe payment intent via the transaction record
        const { data: txn } = await db
          .from('transactions')
          .select('stripe_payment_intent_id')
          .eq('id', order.transaction_id)
          .single()

        if (txn?.stripe_payment_intent_id) {
          try {
            await stripe.refunds.create({
              payment_intent: txn.stripe_payment_intent_id,
              amount: body.refund_amount_cents,
            })
          } catch (stripeErr: unknown) {
            const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe refund failed'
            return NextResponse.json({ error: msg }, { status: 500 })
          }

          update.status = 'refunded'
          update.resolved_by = user!.id
          update.resolved_at = new Date().toISOString()
        }
      }
    }
  }

  const { error: dbError } = await db.from('returns').update(update).eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  await logAdminAction(user!.id, 'update_return', 'return' as 'order', id, body as Record<string, unknown>)

  return NextResponse.json({ ok: true })
}
