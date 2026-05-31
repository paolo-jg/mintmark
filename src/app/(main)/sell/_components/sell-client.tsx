'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Plus, Package, TrendingUp, Clock, CheckCircle2, AlertTriangle, ArrowRight, Loader2, X, Banknote, Lock, Users, Upload, MessageCircle, Gavel, RotateCcw, Trash2, Download } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { SellerOnboardingModal } from '@/components/sell/seller-onboarding-modal'
import { UpgradePlanModal } from '@/components/sell/upgrade-plan-modal'
import { MessagesPanel } from './messages-panel'
import { AuctionCountdown } from '@/components/ui/auction-countdown'

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
type TypeFilter = 'all' | 'fixed' | 'auction'

interface AuctionInfo {
  id: string
  current_bid: number | null
  start_price: number
  end_time: string
  bid_count: number
  reserve_price: number | null
}

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
  accept_offers: boolean | null
  auction?: AuctionInfo | null
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

interface AwaitingTrackingOrder {
  id: string
  amount: number
  seller_payout_cents: number | null
  created_at: string
  listing: { coin_name: string | null; title: string | null } | null
}

interface SellData {
  allListings: Listing[]
  orders: { amount: number; status: string }[]
  payoutOrders: PayoutOrder[]
  awaitingTracking: AwaitingTrackingOrder[]
  tier: Tier
  carryOver: number
  createdThisMonth: number
  stripeOnboardingComplete: boolean
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
    { data: awaitingTracking },
    { data: profile },
    { count: carryOver },
    { count: createdThisMonth },
  ] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, price, listing_type, status, grade, grading_service, verification_status, images, created_at, year, mint_mark, accept_offers')
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
    supabase
      .from('orders')
      .select('id, amount, seller_payout_cents, created_at, listing:listings!orders_listing_id_fkey(coin_name, title)')
      .eq('seller_id', sellerId)
      .eq('status', 'awaiting_shipment')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('subscription_tier, stripe_account_id, stripe_onboarding_complete').eq('id', sellerId).single(),
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
      .gte('created_at', monthStart)
      .in('status', ['active', 'sold', 'expired']),
  ])

  // Fetch auction rows for auction listings
  const auctionListingIds = (allListings ?? [])
    .filter(l => l.listing_type === 'auction')
    .map(l => l.id)

  let auctionMap = new Map<string, AuctionInfo>()
  if (auctionListingIds.length > 0) {
    const { data: auctionRows } = await supabase
      .from('auctions')
      .select('id, listing_id, current_bid, start_price, end_time, bid_count, reserve_price')
      .in('listing_id', auctionListingIds)
    for (const row of auctionRows ?? []) {
      auctionMap.set(row.listing_id, {
        id: row.id,
        current_bid: row.current_bid,
        start_price: row.start_price,
        end_time: row.end_time,
        bid_count: row.bid_count,
        reserve_price: row.reserve_price ?? null,
      })
    }
  }

  const mergedListings: Listing[] = (allListings ?? []).map(l => ({
    ...(l as Listing),
    auction: auctionMap.get(l.id) ?? null,
  }))

  return {
    allListings: mergedListings,
    orders: (orders ?? []) as { amount: number; status: string }[],
    payoutOrders: (payoutOrders ?? []) as PayoutOrder[],
    awaitingTracking: (awaitingTracking ?? []) as unknown as AwaitingTrackingOrder[],
    tier: ((profile?.subscription_tier ?? 'collector_basic') as Tier),
    carryOver: carryOver ?? 0,
    createdThisMonth: createdThisMonth ?? 0,
    stripeOnboardingComplete: profile?.stripe_onboarding_complete ?? false,
    teamContext,
  }
}

export function SellClient() {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR('sell-dashboard', fetchSellData, { keepPreviousData: true })
  const [tab, setTab] = useState<TabId>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [showMessages, setShowMessages] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)
  const [dismissedOnboarded, setDismissedOnboarded] = useState(false)
  const [relistingId, setRelistingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [relistModal, setRelistModal] = useState<{ id: string } | null>(null)
  const [relistingMode, setRelistingMode] = useState<'as-is' | 'edit' | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [showRepriceModal, setShowRepriceModal] = useState(false)
  const [repriceValue, setRepriceValue] = useState('')
  const [repriceType, setRepriceType] = useState<'pct' | 'flat'>('pct')
  const [repricing, setRepricing] = useState(false)

  async function handleBulkReprice() {
    if (!repriceValue.trim()) return
    setRepricing(true)
    const supabase = createClient()
    try {
      const ids = [...selectedListings]
      const selectedItems = (data?.allListings ?? []).filter(l => ids.includes(l.id) && l.price !== null)
      await Promise.all(selectedItems.map(async l => {
        const currentPrice = l.price!
        let newPrice: number
        if (repriceType === 'pct') {
          const pct = parseFloat(repriceValue)
          newPrice = Math.round(currentPrice * (1 + pct / 100))
        } else {
          const delta = Math.round(parseFloat(repriceValue) * 100)
          newPrice = currentPrice + delta
        }
        if (newPrice < 100) newPrice = 100 // minimum $1.00
        await supabase.from('listings').update({ price: newPrice }).eq('id', l.id)
      }))
      toast.success(`Repriced ${selectedItems.length} listing${selectedItems.length !== 1 ? 's' : ''}`)
      setShowRepriceModal(false)
      setSelectMode(false)
      setSelectedListings(new Set())
      setRepriceValue('')
      mutate()
    } catch {
      toast.error('Failed to reprice some listings')
    } finally {
      setRepricing(false)
    }
  }

  function handleExportCSV() {
    const rows = [
      ['Title', 'Status', 'Price', 'Type', 'Grade', 'Grading Service', 'Year', 'Created'].join(','),
      ...(data?.allListings ?? []).map(l => [
        `"${(l.title ?? '').replace(/"/g, '""')}"`,
        l.status,
        l.price !== null ? (l.price / 100).toFixed(2) : '',
        l.listing_type,
        l.grade ?? '',
        l.grading_service ?? '',
        l.year ?? '',
        l.created_at,
      ].join(','))
    ].join('\n')
    const blob = new Blob([rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listings-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteDraft(e: React.MouseEvent, listingId: string) {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(listingId)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('listings').delete().eq('id', listingId)
      if (error) { toast.error(error.message); return }
      toast.success('Draft deleted')
      mutate()
    } catch {
      toast.error('Network error')
    } finally {
      setDeletingId(null)
    }
  }

  function openRelistModal(e: React.MouseEvent, listingId: string) {
    e.preventDefault()
    e.stopPropagation()
    setRelistModal({ id: listingId })
  }

  async function handleRelistAsIs() {
    if (!relistModal) return
    setRelistingMode('as-is')
    setRelistingId(relistModal.id)
    try {
      const res = await fetch(`/api/listings/${relistModal.id}/relist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'active' }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Failed to relist'); return }
      toast.success('Listing is live!')
      setRelistModal(null)
      mutate()
    } catch {
      toast.error('Network error')
    } finally {
      setRelistingId(null)
      setRelistingMode(null)
    }
  }

  async function handleRelistEdit() {
    if (!relistModal) return
    setRelistingMode('edit')
    setRelistingId(relistModal.id)
    try {
      const res = await fetch(`/api/listings/${relistModal.id}/relist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'draft' }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Failed to relist'); return }
      setRelistModal(null)
      router.push(`/listings/new?draft=${json.id}`)
    } catch {
      toast.error('Network error')
    } finally {
      setRelistingId(null)
      setRelistingMode(null)
    }
  }

  // Check for ?onboarded=1, ?onboarding=incomplete, ?tab=draft from URL
  const [stripeReturn, setStripeReturn] = useState<'success' | 'incomplete' | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarded') === '1') {
      setStripeReturn('success')
      mutate()
    } else if (params.get('onboarding') === 'incomplete') {
      setStripeReturn('incomplete')
    }
    if (params.get('upgraded') === '1') {
      toast.success('Plan upgraded! Your listings and history are all intact.')
      mutate()
    }
    const tabParam = params.get('tab') as TabId | null
    if (tabParam && ['all', 'active', 'draft', 'sold', 'expired'].includes(tabParam)) setTab(tabParam)
    if (params.has('onboarded') || params.has('onboarding') || params.has('tab') || params.has('upgraded')) {
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
    // No data - proxy handles the auth redirect; just render nothing
    return null
  }

  const { allListings, orders, payoutOrders, awaitingTracking, tier, carryOver, createdThisMonth, stripeOnboardingComplete, teamContext } = data
  const needsOnboarding = !stripeOnboardingComplete
  const tierConfig = TIER_CONFIG[tier]

  // For auction listings whose end_time has already passed, treat them as 'expired'
  // client-side even if the cron hasn't caught up yet.
  const effectiveStatus = (l: Listing) => {
    if (l.listing_type === 'auction' && l.auction && new Date(l.auction.end_time) <= new Date()) return 'expired'
    return l.status
  }

  // Stats
  const activeCount = allListings.filter(l => effectiveStatus(l) === 'active').length
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

  const draftCount = allListings.filter(l => l.status === 'draft').length

  const listings = (() => {
    let result = tab === 'all' ? allListings : allListings.filter(l => effectiveStatus(l) === tab)
    if (typeFilter !== 'all') result = result.filter(l => l.listing_type === typeFilter)
    return result
  })()

  return (
    <>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Relist confirmation modal */}
      {relistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold mb-1">Relist this coin?</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              This listing will count toward your monthly limit.
              {remaining !== null && (
                <span> You have <span className={`font-semibold ${remaining === 0 ? 'text-destructive' : 'text-foreground'}`}>{remaining} listing{remaining !== 1 ? 's' : ''}</span> remaining this month.</span>
              )}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRelistAsIs}
                disabled={relistingMode !== null}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {relistingMode === 'as-is' && <Loader2 className="h-4 w-4 animate-spin" />}
                Relist as is
              </button>
              <button
                onClick={handleRelistEdit}
                disabled={relistingMode !== null}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold h-11 px-4 hover:bg-muted transition-colors disabled:opacity-60"
              >
                {relistingMode === 'edit' && <Loader2 className="h-4 w-4 animate-spin" />}
                Edit details
              </button>
              <button
                onClick={() => setRelistModal(null)}
                disabled={relistingMode !== null}
                className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller onboarding - blocks the sell page until setup is complete.
          Modal is z-40; navbar is z-50 so navigation away is still possible. */}
      {needsOnboarding && (
        <SellerOnboardingModal
          tier={tier}
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
          {tier === 'dealer' && tab === 'active' && (
            <Button variant="outline" onClick={() => { setSelectMode(v => !v); setSelectedListings(new Set()) }}>
              {selectMode ? 'Cancel' : 'Bulk Reprice'}
            </Button>
          )}
          {tier === 'dealer' && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          )}
          <Button onClick={() => atLimit ? setShowUpgradeModal(true) : router.push('/listings/new')}>
            <Plus className="h-4 w-4 mr-1.5" />
            {atLimit ? 'Upgrade to List More' : 'Create Listing'}
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

      {/* Subtle quota line */}
      {limit !== null ? (
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden flex-shrink-0">
            <div className={`h-full rounded-full transition-all ${barColour}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs ${textColour}`}>{used}/{limit} listings this month</span>
          {atLimit && (
            <button onClick={() => setShowUpgradeModal(true)} className="text-xs font-semibold text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity ml-1">
              Upgrade
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-6">{used} active listing{used !== 1 ? 's' : ''}. Unlimited plan.</p>
      )}

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
        <div className={`rounded-xl border px-4 py-4 ${pendingShipments > 0 ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20' : 'border-border bg-card'}`}>
          <div className="flex items-center gap-2 mb-1">
            {pendingShipments > 0
              ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              : <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            }
            <p className={`text-xs font-semibold tracking-widest uppercase ${pendingShipments > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground/60'}`}>
              {pendingShipments > 0 ? 'Need Tracking' : 'To Ship'}
            </p>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${pendingShipments > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{pendingShipments}</p>
          {pendingShipments > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Payout on hold</p>
          )}
        </div>
      </div>

      {/* Needs tracking - payout blocked */}
      {awaitingTracking.length > 0 && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden mb-8">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Tracking required - payout on hold</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 ml-auto hidden sm:block">Add a tracking number to release your payout</p>
          </div>
          <div className="divide-y divide-amber-200 dark:divide-amber-800">
            {awaitingTracking.map(order => {
              const coinName = (order.listing as { coin_name: string | null; title: string | null } | null)?.coin_name
                ?? (order.listing as { coin_name: string | null; title: string | null } | null)?.title
                ?? `Order #${order.id.slice(0, 8)}`
              return (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{coinName}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      {order.seller_payout_cents !== null ? formatCents(order.seller_payout_cents) : formatCents(order.amount)} held until tracking added
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/orders/${order.id}/ship`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Add Tracking
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {/* Filters + Messages */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Select value={tab} onValueChange={v => setTab(v as TabId)}>
          <SelectTrigger className="h-9 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            {draftCount > 0 && <SelectItem value="draft">Drafts ({draftCount})</SelectItem>}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="h-9 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="fixed">Buy Now</SelectItem>
            <SelectItem value="auction">Auction</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setShowMessages(v => !v)}
          className={`ml-auto flex items-center gap-1.5 h-9 px-3.5 rounded-lg border text-sm font-medium transition-colors ${
            showMessages ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Messages
        </button>
      </div>

      {/* Messages panel */}
      {showMessages && <div className="mb-6"><MessagesPanel /></div>}

      {/* Listings */}
      {!listings?.length ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl">
          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {tab === 'all' ? 'No listings yet' : `No ${tab} listings`}
          </p>

          {tab === 'all' && (
            <Button
              size="lg"
              className="h-11 px-4"
              onClick={() => atLimit ? setShowUpgradeModal(true) : router.push('/listings/new')}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {atLimit ? 'Upgrade to List More' : 'Create Listing'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map(listing => {
            const isAuction = listing.listing_type === 'auction'
            const auc = listing.auction
            const currentBid = auc?.current_bid ?? null
            const reservePrice = auc?.reserve_price ?? null
            const reserveMet = reservePrice !== null && currentBid !== null && currentBid >= reservePrice
            const auctionEnded = isAuction && auc != null && new Date(auc.end_time) <= new Date()
            const displayStatus = auctionEnded ? 'expired' : listing.status
            const isSelectable = selectMode && displayStatus === 'active'
            const isSelected = selectedListings.has(listing.id)

            const gradeMeta = (() => {
              const parts: string[] = []
              if (listing.grading_service) parts.push(listing.grading_service)
              if (listing.grade) parts.push(listing.grade.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2'))
              if (!listing.grading_service && !listing.grade) parts.push('Ungraded')
              if (listing.year) parts.push(`${listing.year}${listing.mint_mark ? `-${listing.mint_mark}` : ''}`)
              return parts.join(' · ')
            })()

            const priceDisplay = !isAuction && listing.price
              ? formatCents(listing.price)
              : isAuction && auc
              ? formatCents(currentBid ?? auc.start_price)
              : null

            const rowContent = (
              <>
                {isSelectable && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-4 w-4 flex-shrink-0 rounded border-border accent-foreground cursor-pointer"
                  />
                )}

                {/* Thumbnail */}
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 relative">
                  {listing.images?.[0] ? (
                    <Image src={listing.images[0]} alt={listing.title} fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Title + auction details - grows to fill space */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-snug">{listing.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{gradeMeta}</p>
                  {isAuction && auc && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Gavel className="h-3 w-3" />
                        {currentBid != null
                          ? <><span className="font-semibold text-foreground">{formatCents(currentBid)}</span> ({auc.bid_count} bid{auc.bid_count !== 1 ? 's' : ''})</>
                          : <>start {formatCents(auc.start_price)}</>
                        }
                      </span>
                      {reservePrice !== null && (
                        <span className={`text-xs font-medium ${reserveMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                          Reserve {reserveMet ? 'met' : 'not met'}
                        </span>
                      )}
                      {listing.price && (
                        <span className="text-xs text-muted-foreground">
                          BIN: <span className="font-medium text-foreground">{formatCents(listing.price)}</span>
                        </span>
                      )}
                      {listing.accept_offers && (
                        <span className="text-xs text-muted-foreground">Offers ok</span>
                      )}
                      <span className="text-xs">
                        {auctionEnded
                          ? <span className="text-destructive font-medium">Ended</span>
                          : <span className="text-muted-foreground">Ends: <AuctionCountdown endTime={auc.end_time} className="text-xs" /></span>
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Type - fixed width column */}
                <p className="text-xs text-muted-foreground w-24 text-right flex-shrink-0 hidden sm:block">
                  {listing.listing_type === 'fixed' ? 'Buy It Now' : listing.listing_type === 'auction' ? 'Auction' : ''}
                </p>

                {/* Price - fixed width column */}
                <p className="text-sm font-bold tabular-nums w-28 text-right flex-shrink-0">
                  {priceDisplay ?? ''}
                </p>

                {/* Status - fixed width column */}
                <div className="w-20 flex justify-end flex-shrink-0">
                  <Badge variant={STATUS_VARIANT[displayStatus] ?? 'secondary'} className="text-xs">
                    {STATUS_LABEL[displayStatus] ?? displayStatus}
                  </Badge>
                </div>

                {/* Action - fixed width column, always present for alignment */}
                <div className="w-16 flex justify-end flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {listing.status === 'draft' ? (
                    <button
                      onClick={e => handleDeleteDraft(e, listing.id)}
                      disabled={deletingId === listing.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Delete draft"
                    >
                      {deletingId === listing.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  ) : (displayStatus === 'expired' || displayStatus === 'sold') ? (
                    <button
                      onClick={e => openRelistModal(e, listing.id)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/60 transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Relist
                    </button>
                  ) : null}
                </div>
              </>
            )

            return isSelectable ? (
              <div
                key={listing.id}
                onClick={() => setSelectedListings(prev => {
                  const next = new Set(prev)
                  if (next.has(listing.id)) next.delete(listing.id)
                  else next.add(listing.id)
                  return next
                })}
                className={`flex items-center gap-4 px-4 py-3.5 bg-card rounded-xl border transition-colors cursor-pointer ${isSelected ? 'border-foreground bg-muted/40' : 'border-border hover:bg-muted/40'}`}
              >
                {rowContent}
              </div>
            ) : (
              <Link
                key={listing.id}
                href={listing.status === 'draft' ? `/listings/new?draft=${listing.id}` : `/listings/${listing.id}`}
                className="flex items-center gap-4 px-4 py-3.5 bg-card rounded-xl border border-border hover:bg-muted/40 transition-colors"
              >
                {rowContent}
              </Link>
            )
          })}
        </div>
      )}

      {/* Floating action bar for bulk reprice */}
      {selectMode && selectedListings.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-border bg-background shadow-2xl px-5 py-3">
          <span className="text-sm font-semibold">{selectedListings.size} selected</span>
          <Button size="sm" onClick={() => setShowRepriceModal(true)}>Reprice</Button>
          <button onClick={() => setSelectedListings(new Set())} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Reprice modal */}
      {showRepriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold mb-1">Reprice {selectedListings.size} listing{selectedListings.size !== 1 ? 's' : ''}</h3>
            <p className="text-sm text-muted-foreground mb-5">Adjust prices by a percentage or flat amount.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setRepriceType('pct')} className={`rounded-lg border-2 py-2 text-sm font-semibold transition-all ${repriceType === 'pct' ? 'border-foreground' : 'border-border text-muted-foreground'}`}>% Change</button>
              <button onClick={() => setRepriceType('flat')} className={`rounded-lg border-2 py-2 text-sm font-semibold transition-all ${repriceType === 'flat' ? 'border-foreground' : 'border-border text-muted-foreground'}`}>Flat Adjust</button>
            </div>
            <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground overflow-hidden mb-4">
              <span className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">{repriceType === 'pct' ? '%' : '$'}</span>
              <input type="text" inputMode="decimal" value={repriceValue} onChange={e => setRepriceValue(e.target.value)} className="flex-1 bg-transparent px-4 py-3 text-lg font-semibold focus:outline-none" placeholder={repriceType === 'pct' ? '-10 or +10' : '-50 or +50'} />
            </div>
            <p className="text-xs text-muted-foreground mb-5">{repriceType === 'pct' ? 'Enter a positive number to increase or negative to decrease (e.g. -10 decreases prices by 10%).' : 'Enter a positive number to add or negative to subtract from each price.'}</p>
            <div className="flex flex-col gap-2">
              <button onClick={handleBulkReprice} disabled={repricing || !repriceValue.trim()} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 disabled:opacity-40">
                {repricing ? <><span className="h-4 w-4 animate-spin border-2 border-background/40 border-t-background rounded-full" /> Repricing...</> : 'Apply'}
              </button>
              <button onClick={() => setShowRepriceModal(false)} disabled={repricing} className="w-full text-sm text-muted-foreground py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    <UpgradePlanModal
      open={showUpgradeModal}
      onOpenChange={setShowUpgradeModal}
      returnPath="/sell"
    />
    </>
  )
}
