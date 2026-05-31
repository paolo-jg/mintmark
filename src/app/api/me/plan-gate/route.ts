import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ requiresPlanSelection: false })

  const db = getServiceDb()
  const { data: profile } = await db
    .from('profiles')
    .select('requires_plan_selection')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ requiresPlanSelection: profile?.requires_plan_selection ?? false })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() as { action: string }
  if (action !== 'continue_free') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const db = getServiceDb()
  await db.from('profiles').update({ requires_plan_selection: false }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
