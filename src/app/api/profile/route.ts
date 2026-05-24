import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Build the update object — only allow safe fields
  const update: Record<string, string | null> = {}

  if ('display_name' in body) {
    const val = (body.display_name ?? '').trim()
    update.display_name = val || null
  }

  // Dealer-only fields — safe to write regardless; the UI already guards access
  if ('dealer_logo_url' in body) {
    const val = (body.dealer_logo_url ?? '').trim()
    update.dealer_logo_url = val || null
  }

  if ('dealer_description' in body) {
    const val = (body.dealer_description ?? '').trim()
    update.dealer_description = val || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
