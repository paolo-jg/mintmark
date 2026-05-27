import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const db = getServiceDb()
  const { data: profile } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, error: null }
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: 'user' | 'listing' | 'order' | 'dispute' | 'platform',
  targetId: string,
  metadata: Record<string, unknown> = {}
) {
  const db = getServiceDb()
  await db.from('admin_actions').insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, metadata })
}
