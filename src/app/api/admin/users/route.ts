import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  let query = db
    .from('profiles')
    .select('id, email, username, display_name, subscription_tier, is_admin, suspended, suspended_reason, suspended_at, created_at, completed_orders_count, average_rating', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`)
  }

  const { data, count, error: dbError } = await query
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ users: data, total: count ?? 0, page, limit })
}
