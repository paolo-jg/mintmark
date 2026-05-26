import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ProfileForm } from './_components/profile-form'

const TIER_LABEL: Record<string, string> = {
  collector_basic:    'Free',
  collector_premium:  'Premium',
  dealer:             'Dealer',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, dealer_logo_url, dealer_description, subscription_tier, average_rating, rating_count')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier ?? 'collector_basic'
  const isDealer = tier === 'dealer'
  const tierLabel = TIER_LABEL[tier] ?? tier

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your public profile information</p>
      </div>

      {/* Account overview */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1">Account</p>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <Badge variant="secondary">{tierLabel}</Badge>
      </div>

      <ProfileForm
        initialDisplayName={profile?.display_name ?? ''}
        initialDealerLogoUrl={profile?.dealer_logo_url ?? ''}
        initialDealerDescription={profile?.dealer_description ?? ''}
        isDealer={isDealer}
      />
    </div>
  )
}
