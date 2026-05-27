'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Plus, Package, TrendingUp, Clock, CheckCircle2, AlertTriangle, ArrowRight, Loader2, X, Banknote, Lock, Users, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SellerOnboardingModal } from '@/components/sell/seller-onboarding-modal'

// ── Tier config ───────────────────────────────────────────────────────────────
type Tier =
  | 'collector_basic'
  | 'collector_premium'
  | 'dealer'

const TIER_CONFIG: Record<Tier, { label: string; monthlyLimit: number | null }> = {
  collector_basic:    { label: 'Free',    monthlyLimit: 10 },
  collector_premium:  { label: 'Premium', monthlyLimit: 50 },
  dealer:             { label: 'Dealer',  monthlyLimit: null },
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  sold: 'Sold',
  expired: 'Expired',
  draft: 'Draft',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  sold: 'outline',
  expired: 'secondary',
  draft: 'secondary',
}

type TabId = 'all' | 'active' | 'draft' | 'sold' | 'expired'

interface Listing {
  id: string
  title: string
  price: number | null
  listing_type: string
  status: string
  grade: string | null
  grading_service: string | null
  verification_status: string | null
  images: string[] | null
  created_at: string
  year: number | null
  mint_mark: string | null
}

interface PayoutOrder {
  id: string
  amount: number
  status: string
  seller_payout_cents: number | null
  transfer_released: boolean
  transfer_id: string | null
  auto_confirm_at: string | null
  created_at: string
}

interface SellData {
  allListings: Listing[]
  orders: { amount: number; status: string }[]
  payoutOrders: PayoutOrder[]
  tier: Tier
  carryOver: number
  createdThisMonth: number
  stripeOnboardingComplete: boolean
  sellerTosAgreed: boolean
  privacyPolicyAgreed: boolean
  teamContext: { dealerId: string; dealerName: string; role: string } | null
}

export async function fetchSellData(): Promise<SellData | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  // Check if this user is a team member acting on behalf of a dealer
  const { data: membership } = await supabase
    .from('team_members')
    .select('dealer_id, role, profiles!dealer_id(display_name, email)')
    .eq('user_id', user.id)
    .single()

  const sellerId = membership?.dealer_id ?? user.id
  const teamContext = membership
    ? {
        dealerId: membership.dealer_id,
        dealerName: (membership.profiles as unknown as { display_name: string | null; email: string } | null)?.display_name
          ?? (membership.profiles as unknown as { display_name: string | null; email: string } | null)?.email
          ?? 'Dealer',
        role: membership.role,
      }
    : null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: allListings },
    { data: orders },
    { data: payoutOrders },
    { data: profile },
    { count: carryOver },
    { count: createdThisMonth },
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, price, listing_type, status, grade, grading_service, verification_status, images, created_at, year, mint_mark')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false }),
    supabase.from('orders').select('amount, status').eq('seller_id', sellerId),
    supabase
      .from('orders')
      .select('id, amount, status, seller_payout_cents, transfer_released, transfer_id, auto_confirm_at, created_at')
      .eq('seller_id', sellerId)
      .in('status', ['label_purchased', 'shipped', 'delivered', 'complete', 'disputed'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('profiles').select('subscription_tier, stripe_account_id, stripe_onboarding_complete, seller_tos_agreed, privacy_policy_agreed').eq('id', sellerId).single(),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'active')
      .lt('created_at', monthStart),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .gte('created_at', monthStart),
  ])

  return {
    allListings: (allListings ?? []) as Listing[],
    orders: (orders ?? []) as { amount: number; status: string }[],
    payoutOrders: (payoutOrders ?? []) as PayoutOrder[],
    tier: ((profile?.subscription_tier ?? 'collector_basic') as Tier),
    carryOver: carryOver ?? 0,
    createdThisMonth: createdThisMonth ?? 0,
    stripeOnboardingComplete: profile?.stripe_onboarding_complete ?? false,
    sellerTosAgreed: profile?.seller_tos_agreed ?? false,
    privacyPolicyAgreed: profile?.privacy_policy_agreed ?? false,
    teamContext,
  }
}

export function SellClient() {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR('sell-dashboard', fetchSellData, { keepPreviousData: true })
  const [tab, setTab] = useState<TabId>('all')
  const [connectLoading, setConnectLoading] = useState(false)
  const [dismissedOnboarded, setDismissedOnboarded] = useState(false)

  // Check for ?onboarded=1, ?onboarding=incomplete, ?tab=draft from URL
  const [stripeReturn, setStripeReturn] = useState<'success' | 'incomplete' | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarded') === '1') {
      setStripeReturn('success')
      mutate() // force-refresh so needsOnboarding re-evaluates with updated DB flags
    } else if (params.get('onboarding') === 'incomplete') {
      setStripeReturn('incomplete')
    }
    const tabParam = params.get('tab') as TabId | null
    if (tabParam && ['all', 'active', 'draft', 'sold', 'expired'].includes(tabParam)) setTab(tabParam)
    // Clean up the URL
    if (params.has('onboarded') || params.has('onboarding') || params.has('tab')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [mutate])

  async function handleConnectStripe() {
    setConnectLoading(true)
    try {
      const res = await fetch('/api/stripe/connect/create', { method: 'POST' })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        console.error('No onboarding URL returned', json)
        setConnectLoading(false)
      }
    } catch (e) {
      console.error('Stripe connect error', e)
      setConnectLoading(false)
    }
  }

  if (isLoading && !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="flex items-center justify-between mb-8">
          <div className="h-7 w-36 bg-muted rounded" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>

        <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-muted rounded w-32" />
              <div className="h-5 bg-muted rounded w-24" />
            </div>
            <div className="h-4 bg-muted rounded w-20" />
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-1.5">
            <div className="h-full w-1/3 rounded-full bg-muted/60" />
          </div>
          <div className="h-3 bg-muted rounded w-40" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card px-4 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 bg-muted rounded" />
                <div className="h-2.5 bg-muted rounded w-12" />
              </div>
              <div className="h-7 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-border mb-6">
          {['All', 'Active', 'Sold', 'Expired'].map(label => (
            <div key={label} className="px-4 py-2.5">
              <div className="h-3.5 bg-muted rounded w-10" />
            </div>
          ))}
        </div>

        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 bg-card">
              <div className="h-12 w-12 rounded-lg bg-muted/60 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-3 bg-muted rounded w-16 hidden sm:block flex-shrink-0" />
              <div className="h-3.5 bg-muted rounded w-16 flex-shrink-0" />
              <div className="h-5 bg-muted rounded w-14 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    // No data — proxy handles the auth redirect; just render nothing
    return null
  }

  const { allListings, orders, payoutOrders, tier, carryOver, createdThisMonth, stripeOnboardingComplete, sellerTosAgreed, privacyPolicyAgreed, teamContext } = data
  // needsOnboarding: true until both agreements signed AND Stripe connected
  const needsOnboarding = !sellerTosAgreed || !privacyPolicyAgreed || !stripeOnboardingComplete
  const tierConfig = TIER_CONFIG[tier]

  // Stats
  const activeCount = allListings.filter(l => l.status === 'active').length
  const soldCount   = allListings.filter(l => l.status === 'sold').length
  const revenue     = orders.filter(o => o.status !== 'disputed').reduce((s, o) => s + (o.amount ?? 0), 0)
  const pendingShipments = orders.filter(o => o.status === 'awaiting_shipment').length

  // Quota
  const used = carryOver + createdThisMonth
  const limit = tierConfig.monthlyLimit
  const remaining = limit !== null ? Math.max(limit - used, 0) : null
  const pct = limit !== null ? Math.min((used / limit) * 100, 100) : 0
  const atLimit = limit !== null && used >= limit

  const barColour = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-foreground/70'
  const textColour = pct >= 90 ? 'text-destructive' : pct >= 70 ? 'text-amber-600' : 'text-muted-foreground'

  // Client-side tab filtering
  const listings = tab === 'all' ? allListings : allListings.filter(l => l.status === tab)

  const draftCount = allListings.filter(l => l.status === 'draft').length

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'all',     label: 'All' },
    { id: 'active',  label: 'Active' },
    ...(draftCount > 0 ? [{ id: 'draft' as TabId, label: 'Drafts', count: draftCount }] : []),
    { id: 'sold',    label: 'Sold' },
    { id: 'expired', label: 'Expired' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Seller onboarding — blocks the sell page until setup is complete.
          Modal is z-40; navbar is z-50 so navigation away is still possible. */}
      {needsOnboarding && (
        <SellerOnboardingModal
          tier={tier}
          sellerTosAgreed={sellerTosAgreed}
          privacyPolicyAgreed={privacyPolicyAgreed}
          stripeOnboardingComplete={stripeOnboardingComplete}
          onComplete={() => mutate()}
        />
      )}

      {/* Team context banner */}
      {teamContext && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>
            Managing listings for <span className="font-semibold">{teamContext.dealerName}</span>
            <span className="text-muted-foreground ml-1.5 capitalize">({teamContext.role})</span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {teamContext ? `${teamContext.dealerName}'s Listings` : 'My Listings'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {tier === 'dealer' && (
            <Button variant="outline" onClick={() => router.push('/dashboard/import')}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import CSV
            </Button>
          )}
          <Button disabled={atLimit} onClick={() => router.push('/listings/new')}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Listing
          </Button>
        </div>
      </div>

      {/* Stripe onboarding success toast */}
      {stripeReturn === 'success' && !dismissedOnboarded && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Your payout account is connected. You're ready to sell!
            </p>
          </div>
          <button onClick={() => setDismissedOnboarded(true)} className="text-emerald-600 hover:text-emerald-800 transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stripe onboarding incomplete notice */}
      {stripeReturn === 'incomplete' && (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 mb-6">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Payout setup incomplete</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Your account wasn't fully verified. Complete setup to receive payouts.
              </p>
            </div>
          </div>
          <button
            onClick={handleConnectStripe}
            disabled={connectLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:text-amber-900 transition-colors flex-shrink-0 mt-0.5"
          >
            {connectLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Resume setup
          </button>
        </div>
      )}

      {/* Monthly listing quota */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Monthly Listings</p>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              {tierConfig.label}
            </span>
          </div>
          {limit !== null ? (
            <p className={`text-sm font-semibold tabular-nums ${textColour}`}>
              {remaining} remaining
            </p>
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">Unlimited</p>
          )}
        </div>

        {limit !== null ? (
          <>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all ${barColour}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-xs ${textColour}`}>
                {used} of {limit} active listings
              </p>
              {atLimit && (
                <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Limit reached
                </div>
              )}
            </div>
            {atLimit && (
              <p className="text-xs text-muted-foreground mt-2">
                Upgrade your plan to list more coins this month.{' '}
                <Link href="/#pricing" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  View plans
                </Link>
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {used} active listing{used !== 1 ? 's' : ''}. No cap on your plan.
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Active</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Sold</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{soldCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Revenue</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{formatCents(revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">To Ship</p>
          </div>
          <p className="text-2xl font-bold tabular-nums">{pendingShipments}</p>
        </div>
      </div>

      {/* Payouts */}
      {payoutOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Banknote className="h-4 w-4 text-muted-foreground/60" />
            <p className="text-sm font-semibold">Payouts</p>
          </div>
          <div className="divide-y divide-border">
            {payoutOrders.map(order => {
              const payout = order.seller_payout_cents
              const released = order.transfer_released
              const disputed = order.status === 'disputed'
              const autoAt = order.auto_confirm_at ? new Date(order.auto_confirm_at) : null
              const now = new Date()
              const hoursLeft = autoAt ? Math.max(0, Math.ceil((autoAt.getTime() - now.getTime()) / 3600000)) : null

              let statusLabel = ''
              let statusClass = ''
              let Icon = Lock

              if (disputed) {
                statusLabel = 'Disputed'
                statusClass = 'text-destructive'
                Icon = AlertTriangle
              } else if (released) {
                statusLabel = 'Released'
                statusClass = 'text-emerald-600 dark:text-emerald-400'
                Icon = CheckCircle2
              } else if (order.status === 'delivered' && hoursLeft !== null) {
                statusLabel = `Auto-releases in ${hoursLeft}h`
                statusClass = 'text-amber-600 dark:text-amber-400'
                Icon = Clock
              } else {
                statusLabel = 'In escrow'
                statusClass = 'text-muted-foreground'
                Icon = Lock
              }

              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${statusClass}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-medium ${statusClass}`}>{statusLabel}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Order #{order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums flex-shrink-0">
                    {payout !== null ? formatCents(payout) : '—'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {t.label}
              {t.count != null && (
                <span className="text-[10px] font-semibold bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
                  {t.count}
                </span>
              )}
            </span>
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Listings */}
      {!listings?.length ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl">
          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {tab === 'all' ? 'No listings yet' : `No ${tab} listings`}
          </p>

          {tab === 'all' && !atLimit && (
            <Button size="lg" className="h-11 px-4" render={<Link href="/listings/new" />}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Listing
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {listings.map(listing => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="flex items-center gap-4 px-4 py-3.5 bg-card hover:bg-muted/40 transition-colors"
            >
              {/* Thumbnail */}
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 relative">
                {listing.images?.[0] ? (
                  <Image src={listing.images[0]} alt={listing.title} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{listing.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(() => {
                    const parts: string[] = []
                    if (listing.grading_service) parts.push(listing.grading_service)
                    if (listing.grade) parts.push(listing.grade.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2'))
                    if (!listing.grading_service && !listing.grade) parts.push('Ungraded')
                    if (listing.year) parts.push(`${listing.year}${listing.mint_mark ? `-${listing.mint_mark}` : ''}`)
                    return parts.join(' · ')
                  })()}
                </p>
              </div>

              {/* Type */}
              <p className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                {listing.listing_type === 'fixed' ? 'Buy It Now' : 'Auction'}
              </p>

              {/* Price */}
              <p className="text-sm font-semibold tabular-nums flex-shrink-0 w-24 text-right">
                {listing.listing_type === 'fixed' && listing.price
                  ? formatCents(listing.price)
                  : listing.listing_type === 'auction'
                  ? 'Auction'
                  : '—'}
              </p>

              {/* Status / draft CTA */}
              {listing.status === 'draft' ? (
                <Link
                  href={`/listings/${listing.id}/edit`}
                  onClick={e => e.stopPropagation()}
                  className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg border border-border bg-muted hover:bg-muted/60 transition-colors whitespace-nowrap"
                >
                  Add Images &amp; Publish
                </Link>
              ) : (
                <Badge variant={STATUS_VARIANT[listing.status]} className="text-xs flex-shrink-0">
                  {STATUS_LABEL[listing.status]}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
