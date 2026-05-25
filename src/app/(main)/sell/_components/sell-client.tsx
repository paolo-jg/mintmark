'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Plus, Package, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'

// ── Tier config ───────────────────────────────────────────────────────────────
type Tier =
  | 'collector_basic'
  | 'collector_standard'
  | 'collector_premium'
  | 'dealer_basic'
  | 'dealer_standard'
  | 'dealer_premium'

const TIER_CONFIG: Record<Tier, { label: string; monthlyLimit: number | null }> = {
  collector_basic:    { label: 'Collector Basic',    monthlyLimit: 10 },
  collector_standard: { label: 'Collector Standard', monthlyLimit: 50 },
  collector_premium:  { label: 'Collector Premium',  monthlyLimit: 200 },
  dealer_basic:       { label: 'Dealer Basic',        monthlyLimit: null },
  dealer_standard:    { label: 'Dealer Standard',     monthlyLimit: null },
  dealer_premium:     { label: 'Dealer Premium',      monthlyLimit: null },
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

type TabId = 'all' | 'active' | 'sold' | 'expired'

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

interface SellData {
  allListings: Listing[]
  orders: { amount: number; status: string }[]
  tier: Tier
  carryOver: number
  createdThisMonth: number
}

async function fetchSellData(): Promise<SellData | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: allListings },
    { data: orders },
    { data: profile },
    { count: carryOver },
    { count: createdThisMonth },
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, price, listing_type, status, grade, grading_service, verification_status, images, created_at, year, mint_mark')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('orders').select('amount, status').eq('seller_id', user.id),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .lt('created_at', monthStart),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .gte('created_at', monthStart),
  ])

  return {
    allListings: (allListings ?? []) as Listing[],
    orders: (orders ?? []) as { amount: number; status: string }[],
    tier: ((profile?.subscription_tier ?? 'collector_basic') as Tier),
    carryOver: carryOver ?? 0,
    createdThisMonth: createdThisMonth ?? 0,
  }
}

export function SellClient() {
  const { data, isLoading } = useSWR('sell-dashboard', fetchSellData, { keepPreviousData: true })
  const [tab, setTab] = useState<TabId>('all')

  if (isLoading && !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-8" />
        <div className="h-24 bg-muted animate-pulse rounded-xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    // Not logged in — redirect handled server-side, but just in case
    if (typeof window !== 'undefined') window.location.href = '/auth/login'
    return null
  }

  const { allListings, orders, tier, carryOver, createdThisMonth } = data
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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all',     label: 'All' },
    { id: 'active',  label: 'Active' },
    { id: 'sold',    label: 'Sold' },
    { id: 'expired', label: 'Expired' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Listings</h1>
        </div>
        <Button render={<Link href="/listings/new" />} disabled={atLimit}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Listing
        </Button>
      </div>

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
            {t.label}
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

              {/* Status */}
              <Badge variant={STATUS_VARIANT[listing.status]} className="text-xs flex-shrink-0">
                {STATUS_LABEL[listing.status]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
