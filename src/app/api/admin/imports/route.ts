import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getServiceDb } from '@/lib/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { data, error: dbError } = await db
    .from('listing_import_requests')
    .select('*, dealer:profiles!listing_import_requests_dealer_id_fkey(email, display_name)')
    .order('created_at', { ascending: false })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}
