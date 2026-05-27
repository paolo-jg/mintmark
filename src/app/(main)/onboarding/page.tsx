export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { OnboardingClient } from './_components/onboarding-client'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, subscription_tier, onboarding_completed')
    .eq('id', user.id)
    .single()

  // Already onboarded — skip to app
  if (profile?.onboarding_completed) redirect('/listings')

  const cookieStore = await cookies()
  const referralCode = cookieStore.get('pc_ref')?.value ?? null

  return (
    <OnboardingClient
      initialUsername={profile?.username ?? ''}
      initialDisplayName={profile?.display_name ?? ''}
      currentTier={(profile?.subscription_tier ?? 'collector_basic') as any}
      referralCode={referralCode}
    />
  )
}
