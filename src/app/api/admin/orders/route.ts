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
    .from('orders')
    .select(`
      id, amount, status, seller_payout_cents, platform_fee_cents,
      transfer_released, created_at, updated_at,
      buyer:profiles!orders_buyer_id_fkey(email, username),
      seller:profiles!orders_seller_id_fkey(email, username),
      listing:listings!orders_listing_id_fkey(title, coin_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ orders: data, total: count ?? 0, page, limit })
}
