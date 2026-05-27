import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  const db = getServiceDb()

  let query = db
    .from('returns')
    .select(`
      id, reason, status, refund_amount_cents, created_at, updated_at,
      filed_by_profile:profiles!returns_filed_by_fkey(username, email),
      order:orders!returns_order_id_fkey(
        id, amount,
        seller:profiles!orders_seller_id_fkey(username),
        listing:listings!orders_listing_id_fkey(title)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ returns: data ?? [], total: count ?? 0, page, limit })
}
