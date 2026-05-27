'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Heart, ShoppingBag, Tag, Package, CheckCircle2, X, ArrowLeftRight, Loader2, Wallet, Users, Gavel, Copy, Check as CheckIcon, Gift, Info, AlertTriangle } from 'lucide-react'
import { formatCents } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_shipment: 'Awaiting Shipment',
  label_purchased: 'Label Purchased',
  shipped: 'Shipped',
  delivered: 'Delivered',
  disputed: 'Disputed',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

const STATUS_VARIANTS: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  awaiting_shipment: 'destructive',
  label_purchased: 'secondary',
  shipped: 'default',
  delivered: 'default',
  disputed: 'destructive',
  complete: 'outline',
  cancelled: 'secondary',
}

interface Offer {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount_cents: number
  status: string
  counter_amount_cents: number | null
  message: string | null
  expires_at: string
  created_at: string
  listings: { coin_name: string | null; price: number | null } | null
}

interface RepeatBuyer {
  buyer_id: string
  username: string | null
  display_name: string | null
  purchase_count: number
  total_spent: number
  last_purchase_at: string
}

interface HomeData {
  isLoggedIn: boolean
  userId: string
  allSellingOrders: { amount: number; status: string; created_at: string }[]
  allBuyingOrders: { amount: number; status: string; created_at: string }[]
  activeListingsData: { id: string; price: number | null }[]
  subscriptionTier: string | null
  incomingOffers: Offer[]
  outgoingOffers: Offer[]
  repeatBuyers: RepeatBuyer[]
  referralCode: string | null
  referralCount: number
  referralConverted: number
}

export async function fetchHomeData(): Promise<HomeData> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    return { isLoggedIn: false, userId: '', allSellingOrders: [], allBuyingOrders: [], activeListingsData: [], subscriptionTier: null, incomingOffers: [], outgoingOffers: [], repeatBuyers: [], referralCode: null, referralCount: 0, referralConverted: 0 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, referral_code')
    .eq('id', user.id)
    .single()

  const isDealer = profile?.subscription_tier === 'dealer'

  const [
    { data: allSellingOrders },
    { data: allBuyingOrders },
    { data: activeListingsData },
    { data: incomingOffers },
    { data: outgoingOffers },
    { data: sellerOrders },
    { data: referrals },
  ] = await Promise.all([
    supabase.from('orders').select('amount, status, created_at').eq('seller_id', user.id),
    supabase.from('orders').select('amount, status, created_at').eq('buyer_id', user.id),
    supabase.from('listings').select('id, price').eq('seller_id', user.id).eq('status', 'active'),
    supabase.from('offers').select('*, listings(coin_name, price)').eq('seller_id', user.id).in('status', ['pending']).order('created_at', { ascending: false }).limit(10),
    supabase.from('offers').select('*, listings(coin_name, price)').eq('buyer_id', user.id).in('status', ['pending', 'countered']).order('created_at', { ascending: false }).limit(10),
    isDealer
      ? supabase.from('orders').select('buyer_id, amount, created_at').eq('seller_id', user.id).neq('status', 'disputed')
      : Promise.resolve({ data: null }),
    supabase.from('referrals').select('id, status').eq('referrer_id', user.id),
  ])

  // Build repeat buyer list for dealers
  let repeatBuyers: RepeatBuyer[] = []
  if (isDealer && sellerOrders?.length) {
    const byBuyer = new Map<string, { total: number; count: number; last: string }>()
    for (const o of sellerOrders as { buyer_id: string; amount: number; created_at: string }[]) {
      const existing = byBuyer.get(o.buyer_id)
      if (existing) {
        existing.total += o.amount
        existing.count += 1
        if (o.created_at > existing.last) existing.last = o.created_at
      } else {
        byBuyer.set(o.buyer_id, { total: o.amount, count: 1, last: o.created_at })
      }
    }
    const repeatIds = [...byBuyer.entries()].filter(([, v]) => v.count >= 3).map(([id]) => id)
    if (repeatIds.length) {
      const { data: buyerProfiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', repeatIds)
      repeatBuyers = repeatIds
        .map(id => {
          const stats = byBuyer.get(id)!
          const bp = (buyerProfiles ?? []).find((p: { id: string }) => p.id === id) as { id: string; username: string | null; display_name: string | null } | undefined
          return {
            buyer_id: id,
            username: bp?.username ?? null,
            display_name: bp?.display_name ?? null,
            purchase_count: stats.count,
            total_spent: stats.total,
            last_purchase_at: stats.last,
          }
        })
        .sort((a, b) => b.purchase_count - a.purchase_count)
        .slice(0, 10)
    }
  }

  return {
    isLoggedIn: true,
    userId: user.id,
    allSellingOrders: (allSellingOrders ?? []) as { amount: number; status: string; created_at: string }[],
    allBuyingOrders: (allBuyingOrders ?? []) as { amount: number; status: string; created_at: string }[],
    activeListingsData: (activeListingsData ?? []) as { id: string; price: number | null }[],
    subscriptionTier: profile?.subscription_tier ?? null,
    incomingOffers: (incomingOffers ?? []) as Offer[],
    outgoingOffers: (outgoingOffers ?? []) as Offer[],
    repeatBuyers,
    referralCode: (profile as { referral_code?: string | null })?.referral_code ?? null,
    referralCount: (referrals ?? []).length,
    referralConverted: (referrals ?? []).filter((r: { status: string }) => r.status === 'completed').length,
  }
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-7 w-36 bg-muted rounded mb-6" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 rounded-lg bg-muted/60 flex-shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-5 pt-5 pb-4 space-y-2">
            <div className="h-2.5 bg-muted rounded w-2/3" />
            <div className="h-7 bg-muted rounded w-1/2" />
            <div className="h-2.5 bg-muted rounded w-4/5" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="h-4 bg-muted rounded w-56" />
            <div className="flex gap-4">
              <div className="h-3 bg-muted rounded w-12" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
          <div className="flex items-end gap-3 h-32">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-0.5" style={{ height: `${60 + (i % 3) * 20}px` }}>
                  <div className="flex-1 rounded-t-sm bg-muted/60" style={{ height: '100%' }} />
                  <div className="flex-1 rounded-t-sm bg-muted/40" style={{ height: `${40 + (i % 2) * 15}px` }} />
                </div>
                <div className="h-2.5 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card px-6 pt-5 pb-6 space-y-3">
          <div className="h-4 bg-muted rounded w-32 mb-1" />
          <div className="h-3 bg-muted rounded w-44 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
              <div className="h-3 bg-muted rounded w-28" />
              <div className="h-3 bg-muted rounded w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OfferRow({ offer, isSeller, onRespond }: {
  offer: Offer
  isSeller: boolean
  onRespond: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showCounter, setShowCounter] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')

  const title = offer.listings?.coin_name ?? 'Unknown listing'
  const isCountered = offer.status === 'countered'

  async function respond(action: 'accept' | 'decline' | 'counter', counterAmountCents?: number) {
    setLoading(action)
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, counterAmountCents }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(action === 'accept' ? 'Offer accepted' : action === 'decline' ? 'Offer declined' : 'Counter sent')
      onRespond()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(null)
      setShowCounter(false)
    }
  }

  function handleCounter(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(counterAmount.replace(/[^0-9.]/g, '')) * 100)
    if (!cents) { toast.error('Enter a valid counter amount'); return }
    respond('counter', cents)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {isCountered ? `Counter: ${formatCents(offer.counter_amount_cents ?? 0)}` : `Offer: ${formatCents(offer.amount_cents)}`}
          </span>
          {offer.listings?.price && (
            <span className="text-xs text-muted-foreground">· Ask: {formatCents(offer.listings.price)}</span>
          )}
          {offer.message && (
            <span className="text-xs text-muted-foreground italic">· "{offer.message}"</span>
          )}
        </div>
      </div>

      {isSeller && !showCounter && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => respond('accept')}
            disabled={!!loading}
            className="flex items-center gap-1 rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {loading === 'accept' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Accept
          </button>
          <button
            onClick={() => setShowCounter(true)}
            disabled={!!loading}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Counter
          </button>
          <button
            onClick={() => respond('decline')}
            disabled={!!loading}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors disabled:opacity-50"
          >
            {loading === 'decline' ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Decline
          </button>
        </div>
      )}

      {isSeller && showCounter && (
        <form onSubmit={handleCounter} className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={counterAmount}
              onChange={e => setCounterAmount(e.target.value)}
              placeholder="0.00"
              className="w-24 rounded-lg border border-border bg-background pl-5 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-foreground/20"
              autoFocus
            />
          </div>
          <button type="submit" disabled={!!loading} className="rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-semibold hover:bg-foreground/90 disabled:opacity-50">
            {loading === 'counter' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send'}
          </button>
          <button type="button" onClick={() => setShowCounter(false)} className="rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted">
            <X className="h-3 w-3" />
          </button>
        </form>
      )}

      {!isSeller && (
        <Badge variant={isCountered ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
          {isCountered ? 'Countered' : 'Pending'}
        </Badge>
      )}
    </div>
  )
}

function ReferralWidget({ referralCode, referralCount, referralConverted }: { referralCode: string | null; referralCount: number; referralConverted: number }) {
  const [copied, setCopied] = useState(false)

  if (!referralCode) return null

  const link = `https://pedigreecoins.com/ref/${referralCode}`

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted flex-shrink-0">
            <Gift className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold">Refer a friend, get a free month</p>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help flex-shrink-0" />
                <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <p className="font-semibold mb-1">How referrals work</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Share your link with a friend</li>
                    <li>• They sign up and choose a paid plan (Premium or Dealer)</li>
                    <li>• They get their first month free</li>
                    <li>• You get 1 free month of your current plan</li>
                    <li>• Free months stack — refer more, earn more</li>
                  </ul>
                  <p className="mt-1.5 text-muted-foreground/70">Dealer referrers earn a free Dealer month. Basic/Premium referrers earn a free Premium month.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">They get 1 month free Premium. You get 1 month free per sign-up.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {referralCount > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold tabular-nums">{referralConverted} / {referralCount}</p>
              <p className="text-[11px] text-muted-foreground">converted</p>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 pl-3 pr-1.5 py-1.5">
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">{link}</span>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded-md bg-foreground text-background px-2.5 py-1 text-xs font-semibold hover:bg-foreground/90 transition-colors flex-shrink-0"
            >
              {copied ? <CheckIcon className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HomeClient() {
  const { data, isLoading, mutate } = useSWR('home-dashboard', fetchHomeData, { keepPreviousData: true })

  if (isLoading && !data) {
    return <DashboardSkeleton />
  }

  if (!data) return null

  const { allSellingOrders, allBuyingOrders, activeListingsData, subscriptionTier, incomingOffers, outgoingOffers, userId, repeatBuyers, referralCode, referralCount, referralConverted } = data

  const totalRevenue = allSellingOrders.filter(o => o.status !== 'disputed').reduce((s, o) => s + (o.amount ?? 0), 0)
  const totalSpent = allBuyingOrders.filter(o => o.status !== 'disputed').reduce((s, o) => s + (o.amount ?? 0), 0)
  const activeListingsCount = activeListingsData.length

  const isDealer = subscriptionTier === 'dealer'
  const inventoryValueCents = activeListingsData.reduce((s, l) => s + ((l as { price?: number | null }).price ?? 0), 0)

  const now = new Date()
  const months: { label: string; sales: number; purchases: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('en-US', { month: 'short' })
    const inMonth = (o: { created_at: string }) => {
      const od = new Date(o.created_at)
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
    }
    const monthSales = allSellingOrders.filter(o => o.status !== 'disputed' && inMonth(o))
    const monthPurchases = allBuyingOrders.filter(o => o.status !== 'disputed' && inMonth(o))
    months.push({
      label,
      sales: monthSales.reduce((s, o) => s + (o.amount ?? 0), 0),
      purchases: monthPurchases.reduce((s, o) => s + (o.amount ?? 0), 0),
    })
  }
  const maxMonthAmount = Math.max(...months.flatMap(m => [m.sales, m.purchases]), 1)

  const trailing3Avg = months.slice(-3).reduce((s, m) => s + m.sales, 0) / 3
  const projectedMonthly = inventoryValueCents > 0 ? Math.min(trailing3Avg, inventoryValueCents) : trailing3Avg
  const projectedMonths = [1, 2, 3].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return { label: d.toLocaleString('en-US', { month: 'short' }), projected: projectedMonthly }
  })
  const maxCashflow = Math.max(...months.map(m => m.sales), projectedMonthly, 1)

  const pendingShipments = allSellingOrders.filter(o => o.status === 'awaiting_shipment')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <ReferralWidget referralCode={referralCode} referralCount={referralCount} referralConverted={referralConverted} />

      {/* Quick nav shortcuts */}
      <div className={`grid gap-2 mb-6 grid-cols-3 ${isDealer ? 'sm:grid-cols-7' : 'sm:grid-cols-6'}`}>
        {[
          { href: '/collect?tab=wishlist', icon: Heart, label: 'Wish List' },
          { href: '/listings', icon: Tag, label: 'Marketplace' },
          { href: '/buy-now', icon: ShoppingBag, label: 'Buy Now' },
          { href: '/auctions', icon: Gavel, label: 'Auctions' },
          { href: '/sell', icon: Package, label: 'My Listings' },
          { href: '/collect', icon: Wallet, label: 'Collection' },
          ...(isDealer ? [{ href: '/dashboard/team', icon: Users, label: 'Team' }] : []),
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 hover:border-foreground/20 hover:bg-muted/40 transition-colors group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-center leading-tight">{label}</p>
          </Link>
        ))}
      </div>

      {pendingShipments.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {pendingShipments.length === 1 ? '1 order needs a tracking number' : `${pendingShipments.length} orders need tracking numbers`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Your payout is on hold until you add a tracking number</p>
            </div>
          </div>
          <Link
            href="/sell"
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Add Tracking →
          </Link>
        </div>
      )}

      {/* Row 1: 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold tabular-nums">{formatCents(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">From all completed sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1">Total Spent</p>
            <p className="text-2xl font-bold tabular-nums">{formatCents(totalSpent)}</p>
            <p className="text-xs text-muted-foreground mt-1">On completed purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1">Active Listings</p>
            <p className="text-2xl font-bold tabular-nums">{activeListingsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Currently for sale</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1">Pending Shipments</p>
            <p className="text-2xl font-bold tabular-nums">{pendingShipments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Orders to ship</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Sales chart */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sales vs Purchases, Last 6 Months</CardTitle>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground/80" />
                  Sales
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground/25" />
                  Purchases
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32">
              {months.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5">
                    <div
                      className="flex-1 rounded-t-sm bg-foreground/80 transition-all"
                      style={{ height: `${Math.max((m.sales / maxMonthAmount) * 112, m.sales > 0 ? 4 : 0)}px` }}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-foreground/25 transition-all"
                      style={{ height: `${Math.max((m.purchases / maxMonthAmount) * 112, m.purchases > 0 ? 4 : 0)}px` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            {totalRevenue === 0 && totalSpent === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">No activity yet. Data will appear here once you buy or sell.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Offers */}
      {(incomingOffers.length > 0 || outgoingOffers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {incomingOffers.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Incoming Offers</CardTitle>
                <CardDescription>Offers on your listings</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4">
                {incomingOffers.map(offer => (
                  <OfferRow key={offer.id} offer={offer} isSeller={true} onRespond={() => mutate()} />
                ))}
              </CardContent>
            </Card>
          )}

          {outgoingOffers.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">My Offers</CardTitle>
                <CardDescription>Offers you've made</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 mt-4">
                {outgoingOffers.map(offer => (
                  <OfferRow key={offer.id} offer={offer} isSeller={false} onRespond={() => mutate()} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dealer-only: Repeat Buyers */}
      {isDealer && repeatBuyers.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Repeat Buyers</CardTitle>
            <CardDescription>Customers who have purchased from you more than once</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {repeatBuyers.map((buyer, i) => {
                const name = buyer.display_name || buyer.username || `Buyer #${i + 1}`
                const lastDate = new Date(buyer.last_purchase_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div key={buyer.buyer_id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted-foreground">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">Last purchase {lastDate}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold tabular-nums">{formatCents(buyer.total_spent)}</p>
                      <p className="text-xs text-muted-foreground">{buyer.purchase_count} purchases</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dealer-only: Projected Cashflow */}
      {isDealer && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Projected Cashflow</CardTitle>
                <CardDescription className="mt-0.5">
                  6-month actuals · 3-month projection based on trailing average
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 shrink-0 pt-0.5">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/70" />
                  Actual
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/25 border border-emerald-500/50 border-dashed" />
                  Projected
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {/* Historical bars */}
              {months.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className="w-full rounded-t-sm bg-emerald-500/70 transition-all"
                    style={{ height: `${Math.max((m.sales / maxCashflow) * 144, m.sales > 0 ? 4 : 0)}px` }}
                  />
                  <p className="text-[11px] text-muted-foreground truncate">{m.label}</p>
                </div>
              ))}

              {/* Divider */}
              <div className="self-stretch flex items-start pt-0 pb-5 mx-1">
                <div className="w-px h-full border-l border-dashed border-muted-foreground/30" />
              </div>

              {/* Projected bars */}
              {projectedMonths.map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className="w-full rounded-t-sm bg-emerald-500/25 border border-dashed border-emerald-500/50 border-b-0 transition-all"
                    style={{ height: `${Math.max((m.projected / maxCashflow) * 144, m.projected > 0 ? 4 : 0)}px` }}
                  />
                  <p className="text-[11px] text-muted-foreground truncate">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">Monthly projection</p>
                <p className="font-semibold text-sm mt-0.5 tabular-nums">{formatCents(Math.round(projectedMonthly))}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active inventory</p>
                <p className="font-semibold text-sm mt-0.5 tabular-nums">{formatCents(inventoryValueCents)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">3-month projected</p>
                <p className="font-semibold text-sm mt-0.5 tabular-nums">{formatCents(Math.round(projectedMonthly * 3))}</p>
              </div>
            </div>

            {trailing3Avg === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-3">
                No sales in the last 3 months — projections will populate once you have completed sales.
              </p>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
