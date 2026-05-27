import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb, logAdminAction } from '@/lib/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()

  const [{ data: profile }, { data: authData }, { data: orders }, { data: listings }, { data: disputes }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).single(),
    db.auth.admin.getUserById(id),
    db.from('orders').select('id, amount, status, created_at, listing_id').or(`buyer_id.eq.${id},seller_id.eq.${id}`).order('created_at', { ascending: false }).limit(50),
    db.from('listings').select('id, coin_name, status, price, created_at').eq('seller_id', id).order('created_at', { ascending: false }).limit(50),
    db.from('disputes').select('id, reason, status, created_at, order_id').eq('filed_by', id).order('created_at', { ascending: false }).limit(20),
  ])

  return NextResponse.json({
    profile,
    email: authData.user?.email,
    created_at: authData.user?.created_at,
    last_sign_in: authData.user?.last_sign_in_at,
    orders: orders ?? [],
    listings: listings ?? [],
    disputes: disputes ?? [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json() as {
    suspended?: boolean
    suspended_reason?: string
    subscription_tier?: string
    is_admin?: boolean
  }

  const db = getServiceDb()

  const update: Record<string, unknown> = {}
  if (body.suspended !== undefined) {
    update.suspended = body.suspended
    update.suspended_at = body.suspended ? new Date().toISOString() : null
    update.suspended_reason = body.suspended ? (body.suspended_reason ?? null) : null
  }
  if (body.subscription_tier !== undefined) update.subscription_tier = body.subscription_tier
  if (body.is_admin !== undefined) update.is_admin = body.is_admin

  const { error: dbError } = await db.from('profiles').update(update).eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const action = body.suspended ? 'suspend_user' : body.suspended === false ? 'unsuspend_user' : 'update_user'
  await logAdminAction(user!.id, action, 'user', id, body as Record<string, unknown>)

  return NextResponse.json({ ok: true })
}
