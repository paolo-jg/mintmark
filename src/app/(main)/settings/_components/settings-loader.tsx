'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SettingsClient } from './settings-client'

interface ProfileData {
  display_name: string | null
  subscription_tier: string | null
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean | null
  dealer_logo_url: string | null
  dealer_banner_url: string | null
  dealer_description: string | null
  dealer_tagline: string | null
  average_rating: number | null
  rating_count: number | null
  completed_orders_count: number | null
  created_at: string | null
}

export function SettingsLoader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<ProfileData | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('display_name, subscription_tier, stripe_account_id, stripe_onboarding_complete, dealer_logo_url, dealer_banner_url, dealer_description, dealer_tagline, average_rating, rating_count, completed_orders_count, created_at')
        .eq('id', user.id)
        .single()

      setUserId(user.id)
      setEmail(user.email ?? '')
      setProfile(data)
      setReady(true)
    }
    load()
  }, [])

  if (!ready) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
            <div className="h-12 bg-muted/40 border-b border-border" />
            <div className="p-5 space-y-3">
              <div className="h-4 bg-muted/60 rounded w-1/3" />
              <div className="h-9 bg-muted/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const tab = searchParams.get('tab') ?? 'account'
  const isDealer = profile?.subscription_tier === 'dealer'
  const validTabs = isDealer
    ? ['account', 'addresses', 'billing', 'organization']
    : ['account', 'addresses', 'billing']
  const activeTab = validTabs.includes(tab) ? tab : 'account'

  return (
    <SettingsClient
      userId={userId}
      email={email}
      activeTab={activeTab}
      isDealer={isDealer}
      subscriptionTier={profile?.subscription_tier ?? 'collector_basic'}
      displayName={profile?.display_name ?? ''}
      stripeAccountId={profile?.stripe_account_id ?? null}
      stripeOnboardingComplete={profile?.stripe_onboarding_complete ?? false}
      dealerLogoUrl={profile?.dealer_logo_url ?? ''}
      dealerBannerUrl={profile?.dealer_banner_url ?? ''}
      dealerDescription={profile?.dealer_description ?? ''}
      dealerTagline={profile?.dealer_tagline ?? ''}
      averageRating={profile?.average_rating ?? 0}
      ratingCount={profile?.rating_count ?? 0}
      completedOrdersCount={profile?.completed_orders_count ?? 0}
      memberSince={profile?.created_at ?? null}
    />
  )
}
