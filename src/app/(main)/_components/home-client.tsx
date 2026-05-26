'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shield, TrendingUp, Clock, List, Heart, ShoppingBag, Tag, Package } from 'lucide-react'
import { formatCents } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { PricingSection } from '@/components/layout/pricing-section'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_shipment: 'Awaiting Shipment',
  label_purchased: 'Label Purchased',
  shipped: 'Shipped',
  delivered: 'Delivered',
  disputed: 'Disputed',
  complete: 'Complete',
}

const STATUS_VARIANTS: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  awaiting_shipment: 'destructive',
  label_purchased: 'secondary',
  shipped: 'default',
  delivered: 'default',
  disputed: 'destructive',
  complete: 'outline',
}

interface HomeData {
  isLoggedIn: boolean
  allSellingOrders: { amount: number; status: string; created_at: string }[]
  allBuyingOrders: { amount: number; status: string; created_at: string }[]
  activeListingsData: { id: string; price: number | null }[]
  subscriptionTier: string | null
}

export async function fetchHomeData(): Promise<HomeData> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  if (!user) {
    return { isLoggedIn: false, allSellingOrders: [], allBuyingOrders: [], activeListingsData: [], subscriptionTier: null }
  }

  const [{ data: allSellingOrders }, { data: allBuyingOrders }, { data: activeListingsData }, { data: profile }] = await Promise.all([
    supabase.from('orders').select('amount, status, created_at').eq('seller_id', user.id),
    supabase.from('orders').select('amount, status, created_at').eq('buyer_id', user.id),
    supabase.from('listings').select('id, price').eq('seller_id', user.id).eq('status', 'active'),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
  ])

  return {
    isLoggedIn: true,
    allSellingOrders: (allSellingOrders ?? []) as { amount: number; status: string; created_at: string }[],
    allBuyingOrders: (allBuyingOrders ?? []) as { amount: number; status: string; created_at: string }[],
    activeListingsData: (activeListingsData ?? []) as { id: string; price: number | null }[],
    subscriptionTier: profile?.subscription_tier ?? null,
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

export function HomeClient() {
  const { data, isLoading } = useSWR('home-dashboard', fetchHomeData, { keepPreviousData: true })

  if (isLoading && !data) {
    return <DashboardSkeleton />
  }

  if (!data || !data.isLoggedIn) {
    return <LandingPage />
  }

  const { allSellingOrders, allBuyingOrders, activeListingsData, subscriptionTier } = data

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

      {/* Quick nav shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/collect', icon: Heart, label: 'Wish List', desc: 'Track coins you want' },
          { href: '/buy-now', icon: ShoppingBag, label: 'Buy Now', desc: 'Browse fixed-price coins' },
          { href: '/listings', icon: Tag, label: 'Marketplace', desc: 'Explore all listings' },
          { href: '/sell', icon: Package, label: 'My Listings', desc: 'Manage your listings' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-foreground/20 hover:bg-muted/40 transition-colors group"
          >
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {pendingShipments.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm flex items-center justify-between">
          <span>
            <strong>{pendingShipments.length}</strong>{' '}
            {pendingShipments.length === 1 ? 'order needs' : 'orders need'} to be shipped
          </span>
          <Button size="sm" variant="destructive" render={<Link href="/dashboard/orders" />}>
            Ship Now
          </Button>
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

      {/* Row 2: Sales chart + Fee comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fee Comparison</CardTitle>
            <CardDescription>vs. typical marketplace fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Pedigree Coins', fee: 'From 1.9%', highlight: true },
              { label: 'eBay (coins)', fee: '~12.35%', highlight: false },
              { label: 'Heritage Auctions', fee: '20%+ BP', highlight: false },
              { label: 'PCGS CoinFacts', fee: 'Varies', highlight: false },
            ].map(({ label, fee, highlight }) => (
              <div key={label} className={`flex items-center justify-between py-2 px-3 rounded-lg ${highlight ? 'bg-muted font-semibold' : ''}`}>
                <p className="text-sm">{label}</p>
                <p className={`text-sm tabular-nums ${highlight ? 'text-foreground' : 'text-muted-foreground'}`}>{fee}</p>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-1">Collector Basic tier. Upgrade for lower rates.</p>
          </CardContent>
        </Card>
      </div>

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

function LandingPage() {
  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6">Only professionally graded coins</Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          The marketplace for<br />
          <span className="text-muted-foreground">rare, verified coins</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Every coin on Pedigree Coins is certified by a professional grading service.
          PCGS, NGC, and more. Buy and sell with complete confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" render={<Link href="/listings" />}>Browse Coins</Button>
          <Button size="lg" variant="outline" render={<Link href="/auctions" />}>Live Auctions</Button>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Cert-verified listings', desc: 'PCGS and NGC cert numbers are verified against official APIs at time of listing.' },
              { icon: TrendingUp, title: 'Population & price data', desc: 'See how many coins exist at each grade and realized sale prices for every listing.' },
              { icon: Clock, title: 'Fixed price & auctions', desc: 'Buy now or bid in real-time auctions. Set a reserve price to protect your coin.' },
              { icon: List, title: 'Want list matching', desc: "List the coins you're hunting. Get notified when a matching coin is listed." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-xl font-semibold mb-2">Accepted grading services</h2>
        <p className="text-muted-foreground text-sm mb-8">
          Coins graded by PCGS and NGC are automatically verified. Others are listed with an unverified badge.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'PCGS', verified: true },
            { label: 'NGC', verified: true },
            { label: 'ANACS', verified: false },
            { label: 'ICG', verified: false },
            { label: 'SEGS', verified: false },
          ].map(({ label, verified }) => (
            <Card key={label} className="px-4 py-2">
              <CardContent className="p-0 flex items-center gap-2">
                <span className="font-mono font-semibold text-sm">{label}</span>
                <Badge variant={verified ? 'default' : 'secondary'} className="text-xs">
                  {verified ? 'Auto-verified' : 'Unverified'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <PricingSection />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center">
        <div className="bg-muted rounded-2xl px-8 py-14">
          <h2 className="text-2xl font-bold mb-3">Ready to sell a coin?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a free account, enter your cert number, and your listing goes live in minutes.
          </p>
          <Button size="lg" render={<Link href="/auth/register" />}>Start Selling</Button>
        </div>
      </section>
    </div>
  )
}
