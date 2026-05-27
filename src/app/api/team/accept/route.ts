import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Look up the invite
  const { data: invite } = await serviceClient
    .from('team_invites')
    .select('id, dealer_id, email, role, status, expires_at')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  if (invite.status !== 'pending') return NextResponse.json({ error: 'This invite has already been used or revoked' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

  // Prevent dealer from joining their own team
  if (invite.dealer_id === session.user.id) {
    return NextResponse.json({ error: 'You cannot join your own team' }, { status: 400 })
  }

  // Check not already a member
  const { data: existing } = await serviceClient
    .from('team_members')
    .select('id')
    .eq('dealer_id', invite.dealer_id)
    .eq('user_id', session.user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'You are already on this team' }, { status: 409 })

  // Create member + mark invite accepted (in sequence — service role bypasses RLS)
  const { error: memberError } = await serviceClient
    .from('team_members')
    .insert({
      dealer_id:  invite.dealer_id,
      user_id:    session.user.id,
      role:       invite.role,
      invited_by: invite.dealer_id,
    })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  await serviceClient
    .from('team_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, dealerId: invite.dealer_id })
}
