import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Plus, Package, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

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

// ── Status display ────────────────────────────────────────────────────────────
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

type Tab = 'all' | 'active' | 'sold' | 'expired'

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const tab = ((await searchParams).tab ?? 'all') as Tab

  // ── Listings for the tab ──────────────────────────────────────────────────
  const query = supabase
    .from('listings')
    .select('id, title, price, listing_type, status, grade, grading_service, verification_status, images, created_at, year, mint_mark')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  if (tab !== 'all') query.eq('status', tab)

  const [
    { data: listings },
    { data: allListings },
    { data: orders },
    { data: profile },
  ] = await Promise.all([
    query,
    supabase.from('listings').select('id, status').eq('seller_id', user.id),
    supabase.from('orders').select('amount, status').eq('seller_id', user.id),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
  ])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const activeCount = allListings?.filter(l => l.status === 'active').length ?? 0
  const soldCount   = allListings?.filter(l => l.status === 'sold').length ?? 0
  const revenue     = (orders ?? []).filter(o => o.status !== 'disputed').reduce((s, o) => s + (o.amount ?? 0), 0)
  const pendingShipments = (orders ?? []).filter(o => o.status === 'awaiting_shipment').length

  // ── Monthly listing usage ─────────────────────────────────────────────────
  const tier = (profile?.subscription_tier ?? 'collector_basic') as Tier
  const tierConfig = TIER_CONFIG[tier]

  // Slot consumption rules:
  //   1. Active listings created in a prior month carry over and occupy slots.
  //   2. Every listing created THIS month uses a slot permanently —
  //      deleting or selling it does NOT free the slot.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ count: carryOver }, { count: createdThisMonth }] = await Promise.all([
    // Rule 1: active listings from before this month
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .lt('created_at', monthStart),
    // Rule 2: all listings created this month, any status
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .gte('created_at', monthStart),
  ])

  const used = (carryOver ?? 0) + (createdThisMonth ?? 0)
  const limit = tierConfig.monthlyLimit
  const remaining = limit !== null ? Math.max(limit - used, 0) : null
  const pct = limit !== null ? Math.min((used / limit) * 100, 100) : 0
  const atLimit = limit !== null && used >= limit

  // Progress bar colour: red ≥ 90 %, amber ≥ 70 %, green otherwise
  const barColour = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-amber-500' : 'bg-foreground/70'
  const textColour = pct >= 90 ? 'text-destructive' : pct >= 70 ? 'text-amber-600' : 'text-muted-foreground'

  const tabs: { id: Tab; label: string }[] = [
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
          <Link
            key={t.id}
            href={`/sell${t.id !== 'all' ? `?tab=${t.id}` : ''}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </Link>
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
            <Button size="sm" render={<Link href="/listings/new" />}>
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
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                {listing.images?.[0] ? (
                  <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
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
                  {listing.grading_service} · {listing.grade}
                  {listing.year && ` · ${listing.year}${listing.mint_mark ? `-${listing.mint_mark}` : ''}`}
                </p>
              </div>

              {/* Type */}
              <p className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                {listing.listing_type === 'fixed' ? 'Fixed Price' : 'Auction'}
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
