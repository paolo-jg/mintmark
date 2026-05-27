import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb, logAdminAction } from '@/lib/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json() as { status?: string }
  const db = getServiceDb()

  const { error: dbError } = await db
    .from('listings')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  await logAdminAction(user!.id, 'update_listing', 'listing', id, body as Record<string, unknown>)
  return NextResponse.json({ ok: true })
}
