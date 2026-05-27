export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { AcceptInviteClient } from './_components/accept-invite-client'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function TeamInvitePage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) redirect('/')

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: invite } = await serviceClient
    .from('team_invites')
    .select('id, email, role, status, expires_at, dealer_id, profiles!dealer_id(display_name, email, dealer_logo_url)')
    .eq('token', token)
    .single()

  if (!invite || invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <p className="text-lg font-semibold">Invite not found</p>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid, has already been used, or has expired.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const isLoggedIn = !!session

  const dealer = invite.profiles as unknown as { display_name: string | null; email: string; dealer_logo_url: string | null } | null
  const dealerName = dealer?.display_name ?? dealer?.email ?? 'a dealer'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AcceptInviteClient
        token={token}
        dealerName={dealerName}
        dealerLogoUrl={dealer?.dealer_logo_url ?? null}
        role={invite.role}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )
}
