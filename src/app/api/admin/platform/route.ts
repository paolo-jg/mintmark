import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServiceDb, logAdminAction } from '@/lib/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()
  const { data, error: dbError } = await db.from('platform_settings').select('*')
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) settings[row.key] = row.value

  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const body = await req.json() as Record<string, unknown>
  const db = getServiceDb()

  for (const [key, value] of Object.entries(body)) {
    await db.from('platform_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    })
  }

  await logAdminAction(user!.id, 'update_platform_settings', 'platform', 'platform_settings', body)

  return NextResponse.json({ ok: true })
}
