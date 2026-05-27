export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { SettingsClient } from './_components/settings-client'

export const metadata = { title: 'Settings – Pedigree Coins' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, subscription_tier, stripe_account_id, stripe_onboarding_complete, dealer_logo_url, dealer_banner_url, dealer_description, dealer_tagline, average_rating, rating_count, completed_orders_count, created_at')
    .eq('id', user.id)
    .single()

  const { tab } = await searchParams

  const isDealer = profile?.subscription_tier === 'dealer'
  const validTabs = isDealer ? ['account', 'addresses', 'billing', 'organization'] : ['account', 'addresses', 'billing']
  const activeTab = validTabs.includes(tab ?? '') ? (tab ?? 'account') : 'account'

  return (
    <Suspense>
      <SettingsClient
        userId={user.id}
        email={user.email ?? ''}
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
    </Suspense>
  )
}
