'use client'

import useSWR from 'swr'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatCents } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Tag, Clock, BarChart2, DollarSign } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SoldOrder {
  amount: number
  created_at: string
  listing_id: string
  listings: {
    coin_name: string | null
    grade: string | null
    grading_service: string | null
    series_slug: string | null
    created_at: string
  } | null
}

interface AnalyticsData {
  tier: string
  soldOrders: SoldOrder[]
  totalListedCount: number
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

async function fetchAnalytics(): Promise<AnalyticsData | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const userId = session.user.id

  const [{ data: profile }, { data: soldOrders }, { count: totalListedCount }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', userId).single(),
    supabase
      .from('orders')
      .select('amount, created_at, listing_id, listings(coin_name, grade, grading_service, series_slug, created_at)')
      .eq('seller_id', userId)
      .neq('status', 'disputed')
      .order('created_at', { ascending: true }),
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId),
  ])

  return {
    tier: profile?.subscription_tier ?? 'collector_basic',
    soldOrders: (soldOrders ?? []) as unknown as SoldOrder[],
    totalListedCount: totalListedCount ?? 0,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDollars(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function tooltipFmt(value: number) {
  return fmtDollars(value)
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
      <div className="h-7 w-40 bg-muted rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-5 py-4 space-y-2">
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-7 bg-muted rounded w-1/2" />
            <div className="h-2.5 bg-muted rounded w-4/5" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-6 h-64 space-y-3">
        <div className="h-4 bg-muted rounded w-48" />
        <div className="h-full bg-muted/40 rounded-lg" />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AnalyticsClient() {
  const { data, isLoading } = useSWR('analytics', fetchAnalytics, { keepPreviousData: true })

  if (isLoading && !data) return <Skeleton />
  if (!data) return null

  const { tier, soldOrders, totalListedCount } = data
  const isDealer = tier === 'dealer'
  const now = new Date()

  // ── Core metrics ─────────────────────────────────────────────────────────────

  const totalRevenue = soldOrders.reduce((s, o) => s + o.amount, 0)
  const soldCount = soldOrders.length
  const avgSalePrice = soldCount > 0 ? Math.round(totalRevenue / soldCount) : 0
  const sellThroughRate = totalListedCount > 0 ? Math.round((soldCount / totalListedCount) * 100) : 0

  // Avg days to sell
  const daysToSellList = soldOrders
    .map(o => {
      const listedAt = o.listings?.created_at
      if (!listedAt) return null
      return Math.max(0, Math.round((new Date(o.created_at).getTime() - new Date(listedAt).getTime()) / 86400000))
    })
    .filter((d): d is number => d !== null)
  const avgDaysToSell = daysToSellList.length > 0
    ? Math.round(daysToSellList.reduce((s, d) => s + d, 0) / daysToSellList.length)
    : null

  // ── Monthly revenue (last 12 months) ─────────────────────────────────────────

  const monthlyMap = new Map<string, { revenue: number; count: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    monthlyMap.set(key, { revenue: 0, count: 0 })
  }
  for (const o of soldOrders) {
    const d = new Date(o.created_at)
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    const entry = monthlyMap.get(key)
    if (entry) { entry.revenue += o.amount; entry.count += 1 }
  }
  const monthlyData = [...monthlyMap.entries()].map(([month, { revenue, count }]) => ({ month, revenue, count }))

  // ── Top coins by revenue ──────────────────────────────────────────────────────

  const coinRevMap = new Map<string, number>()
  for (const o of soldOrders) {
    const name = o.listings?.coin_name ?? 'Unknown'
    coinRevMap.set(name, (coinRevMap.get(name) ?? 0) + o.amount)
  }
  const topCoins = [...coinRevMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, revenue]) => ({ name: name.length > 28 ? name.slice(0, 26) + '…' : name, revenue }))

  // ── Dealer: revenue by series ─────────────────────────────────────────────────

  const seriesMap = new Map<string, number>()
  for (const o of soldOrders) {
    const slug = o.listings?.series_slug ?? 'Other'
    const label = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    seriesMap.set(label, (seriesMap.get(label) ?? 0) + o.amount)
  }
  const seriesData = [...seriesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([series, revenue]) => ({ series: series.length > 22 ? series.slice(0, 20) + '…' : series, revenue }))

  // ── Dealer: avg sale price by grade ──────────────────────────────────────────

  const gradeMap = new Map<string, { total: number; count: number }>()
  for (const o of soldOrders) {
    const grade = o.listings?.grade
    if (!grade) continue
    const entry = gradeMap.get(grade)
    if (entry) { entry.total += o.amount; entry.count += 1 }
    else gradeMap.set(grade, { total: o.amount, count: 1 })
  }
  const gradeData = [...gradeMap.entries()]
    .map(([grade, { total, count }]) => ({ grade, avg: Math.round(total / count), count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  // ── Dealer: new vs repeat buyers ─────────────────────────────────────────────

  const buyerOrderCount = new Map<string, number>()
  for (const o of soldOrders) {
    const bid = (o as { buyer_id?: string }).buyer_id ?? ''
    if (bid) buyerOrderCount.set(bid, (buyerOrderCount.get(bid) ?? 0) + 1)
  }
  const totalBuyers = buyerOrderCount.size
  const repeatBuyerCount = [...buyerOrderCount.values()].filter(c => c >= 2).length
  const newBuyerCount = totalBuyers - repeatBuyerCount

  // ── Dealer: fee savings vs eBay (12.35%) and Heritage (20%) ──────────────────

  const ourFee = tier === 'dealer' ? 0 : tier === 'collector_premium' ? 0.019 : 0.07
  const ebayFee = 0.1235
  const heritageFee = 0.20
  const ebaySavings = Math.max(0, Math.round(totalRevenue * (ebayFee - ourFee)))
  const heritageSavings = Math.max(0, Math.round(totalRevenue * (heritageFee - ourFee)))

  // ── Dealer: monthly sell-through rate ─────────────────────────────────────────

  const sellThroughData = monthlyData.map(m => ({
    month: m.month,
    rate: m.count > 0 ? Math.min(100, Math.round((m.count / Math.max(totalListedCount / 12, 1)) * 100)) : 0,
  }))

  // ── Custom tooltip ────────────────────────────────────────────────────────────

  const CurrencyTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
        <p className="font-semibold mb-0.5">{label}</p>
        <p className="text-muted-foreground">{fmtDollars(payload[0].value)}</p>
      </div>
    )
  }

  const RateTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
        <p className="font-semibold mb-0.5">{label}</p>
        <p className="text-muted-foreground">{payload[0].value}%</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isDealer ? 'Dealer analytics' : 'Seller analytics'} · All time
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground/60" />
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCents(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{soldCount} sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Avg Sale Price</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCents(avgSalePrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">Per sold listing</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-3.5 w-3.5 text-muted-foreground/60" />
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Sell-Through</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{sellThroughRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">{soldCount} of {totalListedCount} listed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
              <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Avg Days to Sell</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{avgDaysToSell ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">From listing to sale</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Revenue</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {soldCount === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No sales yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar dataKey="revenue" fill="hsl(var(--foreground))" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top coins by revenue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Coins by Revenue</CardTitle>
          <CardDescription>Your best performing listings</CardDescription>
        </CardHeader>
        <CardContent>
          {topCoins.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">No sales yet</div>
          ) : (
            <div className="space-y-2.5">
              {topCoins.map(({ name, revenue }, i) => {
                const pct = Math.round((revenue / topCoins[0].revenue) * 100)
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium truncate pr-2">{name}</p>
                        <p className="text-xs font-semibold tabular-nums flex-shrink-0">{formatCents(revenue)}</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-foreground/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dealer-only section ────────────────────────────────────────────────── */}
      {isDealer && (
        <>
          {/* Fee savings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Saved vs eBay</p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCents(ebaySavings)}</p>
                <p className="text-xs text-muted-foreground mt-1">vs eBay's ~12.35% seller fee</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">Saved vs Heritage</p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCents(heritageSavings)}</p>
                <p className="text-xs text-muted-foreground mt-1">vs Heritage's 20%+ buyer premium</p>
              </CardContent>
            </Card>
          </div>

          {/* New vs repeat buyers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Buyer Breakdown</CardTitle>
              <CardDescription>New vs repeat customers</CardDescription>
            </CardHeader>
            <CardContent>
              {totalBuyers === 0 ? (
                <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">No sales yet</div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total buyers</p>
                    <p className="text-2xl font-bold">{totalBuyers}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">New buyers</p>
                    <p className="text-2xl font-bold">{newBuyerCount}</p>
                    <p className="text-xs text-muted-foreground">{totalBuyers > 0 ? Math.round((newBuyerCount / totalBuyers) * 100) : 0}% of total</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Repeat buyers</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{repeatBuyerCount}</p>
                    <p className="text-xs text-muted-foreground">{totalBuyers > 0 ? Math.round((repeatBuyerCount / totalBuyers) * 100) : 0}% of total</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by series */}
          {seriesData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue by Series</CardTitle>
                <CardDescription>Top 10 series by total sales</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={seriesData.length * 36 + 16}>
                  <BarChart data={seriesData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="series" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="revenue" fill="hsl(var(--foreground))" radius={[0, 3, 3, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Avg sale price by grade */}
          {gradeData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Avg Sale Price by Grade</CardTitle>
                <CardDescription>Your realized prices across grades</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <div className="divide-y divide-border">
                  <div className="grid grid-cols-3 px-5 py-2">
                    <p className="text-xs font-semibold text-muted-foreground">Grade</p>
                    <p className="text-xs font-semibold text-muted-foreground text-right">Avg Price</p>
                    <p className="text-xs font-semibold text-muted-foreground text-right">Sales</p>
                  </div>
                  {gradeData.map(({ grade, avg, count }) => (
                    <div key={grade} className="grid grid-cols-3 px-5 py-3">
                      <p className="text-sm font-medium">{grade}</p>
                      <p className="text-sm tabular-nums text-right">{formatCents(avg)}</p>
                      <p className="text-sm text-muted-foreground text-right">{count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly sell-through rate trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Sell-Through Rate</CardTitle>
              <CardDescription>Sales volume trend over 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              {soldCount === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">No sales yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={sellThroughData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip content={<RateTooltip />} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
