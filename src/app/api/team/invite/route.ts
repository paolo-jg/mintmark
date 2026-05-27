import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendTeamInvite } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only dealer accounts can invite
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, display_name, email')
    .eq('id', session.user.id)
    .single()

  if (profile?.subscription_tier !== 'dealer') {
    return NextResponse.json({ error: 'Only dealer accounts can manage a team' }, { status: 403 })
  }

  const body = await req.json()
  const { email, role = 'member' } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  if (!['admin', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Role must be admin or member' }, { status: 400 })
  }

  // Check if already a member
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: existingMember } = await serviceClient
    .from('team_members')
    .select('id')
    .eq('dealer_id', session.user.id)
    .eq('user_id', (
      await serviceClient.from('profiles').select('id').eq('email', email.toLowerCase()).single()
    ).data?.id ?? '')
    .single()

  if (existingMember) {
    return NextResponse.json({ error: 'This person is already on your team' }, { status: 409 })
  }

  // Revoke any existing pending invite for this email
  await serviceClient
    .from('team_invites')
    .update({ status: 'revoked' })
    .eq('dealer_id', session.user.id)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')

  // Create invite
  const { data: invite, error } = await serviceClient
    .from('team_invites')
    .insert({
      dealer_id: session.user.id,
      email: email.toLowerCase(),
      role,
    })
    .select('id, token')
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create invite' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pedigreecoins.com'
  const inviteUrl = `${appUrl}/auth/team-invite?token=${invite.token}`
  const dealerName = profile.display_name ?? profile.email

  void sendTeamInvite({ to: email, dealerName, role, inviteUrl }).catch(() => null)

  return NextResponse.json({ id: invite.id }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invites } = await supabase
    .from('team_invites')
    .select('id, email, role, status, expires_at, created_at')
    .eq('dealer_id', session.user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return NextResponse.json({ invites: invites ?? [] })
}
