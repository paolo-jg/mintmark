import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? ''
  const search = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = db
    .from('listings')
    .select(`
      id, title, coin_name, price, status, verification_status, created_at,
      seller:profiles!listings_seller_id_fkey(email, username)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ listings: data, total: count ?? 0, page, limit })
}
