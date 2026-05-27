import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb, logAdminAction } from '@/lib/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { data, error: dbError } = await db
    .from('disputes')
    .select(`
      *,
      filed_by_profile:profiles!disputes_filed_by_fkey(id, email, username),
      resolved_by_profile:profiles!disputes_resolved_by_fkey(email, username),
      order:orders!disputes_order_id_fkey(
        id, amount, status, created_at,
        buyer:profiles!orders_buyer_id_fkey(id, email, username),
        seller:profiles!orders_seller_id_fkey(id, email, username),
        listing:listings!orders_listing_id_fkey(id, title, coin_name, images)
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
  }

  const db = getServiceDb()

  const update: Record<string, unknown> = {}
  if (body.status) {
    update.status = body.status
    if (['resolved_buyer', 'resolved_seller', 'closed'].includes(body.status)) {
      update.resolved_by = user!.id
      update.resolved_at = new Date().toISOString()
    }
  }
  if (body.admin_notes !== undefined) update.admin_notes = body.admin_notes
  update.updated_at = new Date().toISOString()

  const { error: dbError } = await db.from('disputes').update(update).eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // If resolving, update order status to match
  if (body.status === 'resolved_buyer') {
    const { data: dispute } = await db.from('disputes').select('order_id').eq('id', id).single()
    if (dispute) {
      await db.from('orders').update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('id', dispute.order_id)
    }
  } else if (body.status === 'resolved_seller') {
    const { data: dispute } = await db.from('disputes').select('order_id').eq('id', id).single()
    if (dispute) {
      await db.from('orders').update({ status: 'complete', transfer_released: true, updated_at: new Date().toISOString() }).eq('id', dispute.order_id)
    }
  }

  await logAdminAction(user!.id, 'update_dispute', 'dispute', id, body as Record<string, unknown>)

  return NextResponse.json({ ok: true })
}
