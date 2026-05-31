import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'
import { sendImportCompleted } from '@/lib/resend'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json() as { status: 'processing' | 'completed' | 'rejected'; admin_notes?: string }
  const { status, admin_notes } = body

  const db = getServiceDb()

  const updates: Record<string, unknown> = { status }
  if (admin_notes !== undefined) updates.admin_notes = admin_notes
  if (status === 'completed') updates.completed_at = new Date().toISOString()

  const { data: importReq, error: dbError } = await db
    .from('listing_import_requests')
    .update(updates)
    .eq('id', id)
    .select('dealer_id, row_count')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  if (status === 'completed' && importReq) {
    const { data: dealerProfile } = await db
      .from('profiles')
      .select('email, display_name')
      .eq('id', importReq.dealer_id)
      .single()

    if (dealerProfile?.email) {
      const dealerName = dealerProfile.display_name ?? dealerProfile.email
      await sendImportCompleted({
        to: dealerProfile.email,
        dealerName,
        rowCount: importReq.row_count,
      }).catch(() => null)
    }
  }

  return NextResponse.json({ ok: true })
}
