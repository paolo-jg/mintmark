import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = db
    .from('disputes')
    .select(`
      id, reason, description, status, admin_notes, created_at, updated_at, resolved_at,
      filed_by_profile:profiles!disputes_filed_by_fkey(email, username),
      order:orders!disputes_order_id_fkey(id, amount, status,
        buyer:profiles!orders_buyer_id_fkey(email),
        seller:profiles!orders_seller_id_fkey(email),
        listing:listings!orders_listing_id_fkey(title)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ disputes: data, total: count ?? 0, page, limit })
}
