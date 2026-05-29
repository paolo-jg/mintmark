import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import {
  TrendingUp, DollarSign, Clock, AlertTriangle, Users,
  Tag, Package, Truck, TrendingDown, Activity, CreditCard,
  ShoppingBag, BarChart3,
} from 'lucide-react'

type Tier = 'collector_basic' | 'collector_premium' | 'dealer'

const TIER_PRICE: Record<Tier, number> = {
  collector_basic: 0,
  collector_premium: 999,
  dealer: 4999,
}

const TIER_LABEL: Record<Tier, string> = {
  collector_basic: 'Free',
  collector_premium: 'Premium',
  dealer: 'Dealer',
}

function StatCard({
  label, value, sub, icon: Icon, color, bg, negative = false,
}: {
  label: string; value: string; sub: string
  icon: React.ElementType; color: string; bg: string; negative?: boolean
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${bg} mb-3`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${negative ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
    </div>
  )
}

export default async function AdminFinancePage() {
  const db = getServiceDb()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: orders },
    { data: shipments },
    { data: profiles },
    { count: activeListings },
    { data: recentOrders30 },
    { data: recentProfiles30 },
  ] = await Promise.all([
    db.from('orders').select('id, amount, seller_payout_cents, platform_fee_cents, shipping_price_cents, transfer_released, status, created_at, buyer_id, seller_id'),
    db.from('shipments').select('order_id, rate_amount, insured, insured_value, label_deduction_cents'),
    db.from('profiles').select('id, subscription_tier, created_at'),
    db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('orders').select('id, buyer_id, seller_id, created_at').gte('created_at', thirtyDaysAgo),
    db.from('profiles').select('id').gte('created_at', thirtyDaysAgo),
  ])

  const all = orders ?? []
  const allShipments = shipments ?? []
  const allProfiles = profiles ?? []

  // ── GMV & Transaction Fees ───────────────────────────────────────────────
  const gmv = all.reduce((s, o) => s + (o.amount ?? 0), 0)
  const transactionFees = all
    .filter(o => o.transfer_released)
    .reduce((s, o) => s + (o.platform_fee_cents ?? 0), 0)
  const pendingFees = all
    .filter(o => !o.transfer_released && o.status !== 'disputed')
    .reduce((s, o) => s + (o.platform_fee_cents ?? 0), 0)

  // ── Subscription MRR ────────────────────────────────────────────────────
  const tierCounts: Record<Tier, number> = {
    collector_basic: 0,
    collector_premium: 0,
    dealer: 0,
  }
  for (const p of allProfiles) {
    const t = (p.subscription_tier ?? 'collector_basic') as Tier
    if (t in tierCounts) tierCounts[t]++
  }
  const mrr = (Object.entries(tierCounts) as [Tier, number][])
    .reduce((s, [tier, count]) => s + TIER_PRICE[tier] * count, 0)

  // ── Shipping P&L ─────────────────────────────────────────────────────────
  // Sellers purchase labels directly and enter tracking manually.
  // rate_amount on shipments is unused but kept for historical records.
  const shipmentMap = new Map(allShipments.map(s => [s.order_id, s]))
  let shippingDeducted = 0    // total we recovered from sellers
  let shippingLabelCost = 0
  let shippingMarkup = 0
  let shippingLosses = 0
  let spreadOrders = 0
  let freeShippingOrders = 0
  let flatShippingOrders = 0

  for (const order of all) {
    const shipment = shipmentMap.get(order.id)
    if (!shipment || !(shipment.rate_amount ?? 0)) continue

    const labelCost = shipment.rate_amount ?? 0
    const deduction = (shipment as { label_deduction_cents?: number | null }).label_deduction_cents ?? labelCost
    const collected = order.shipping_price_cents ?? 0

    shippingLabelCost += labelCost
    shippingDeducted += deduction
    const margin = deduction - labelCost
    if (margin >= 0) shippingMarkup += margin
    else shippingLosses += Math.abs(margin)

    if (collected === 0) freeShippingOrders++
    else {
      flatShippingOrders++
      if (collected > labelCost) spreadOrders++
    }
  }

  // ── Total Revenue ────────────────────────────────────────────────────────
  const totalRevenue = transactionFees + mrr + shippingMarkup - shippingLosses

  // ── Dispute & Order Metrics ──────────────────────────────────────────────
  const completedOrders = all.filter(o => o.status === 'complete' || o.transfer_released).length
  const disputedOrders = all.filter(o => o.status === 'disputed').length
  const pendingPayout = all
    .filter(o => !o.transfer_released && o.status !== 'disputed' && o.seller_payout_cents)
    .reduce((s, o) => s + (o.seller_payout_cents ?? 0), 0)
  const inDispute = all
    .filter(o => o.status === 'disputed')
    .reduce((s, o) => s + (o.amount ?? 0), 0)
  const disputeRate = all.length > 0 ? ((disputedOrders / all.length) * 100).toFixed(1) : '0.0'
  const avgOrderValue = all.length > 0 ? Math.round(gmv / all.length) : 0

  // ── MAU (unique buyers + sellers active in last 30 days) ─────────────────
  const activeUserIds = new Set<string>()
  for (const o of recentOrders30 ?? []) {
    activeUserIds.add(o.buyer_id)
    activeUserIds.add(o.seller_id)
  }
  const mau = activeUserIds.size
  const newUsers30 = (recentProfiles30 ?? []).length

  // ── Monthly Breakdown (last 6 months) ────────────────────────────────────
  type MonthRow = {
    label: string; gmv: number; fees: number; orders: number
    shippingMarkup: number; shippingLoss: number; newUsers: number
  }
  const months: MonthRow[] = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const slice = all.filter(o => {
      const t = new Date(o.created_at)
      return t >= start && t < end
    })
    let mShippingMarkup = 0
    let mShippingLoss = 0
    for (const o of slice) {
      const shipment = shipmentMap.get(o.id)
      if (!shipment || !(shipment.rate_amount ?? 0)) continue
      const labelCost = shipment.rate_amount ?? 0
      const deduction = (shipment as { label_deduction_cents?: number | null }).label_deduction_cents ?? labelCost
      const margin = deduction - labelCost
      if (margin >= 0) mShippingMarkup += margin
      else mShippingLoss += Math.abs(margin)
    }
    const mNewUsers = allProfiles.filter(p => {
      const t = new Date(p.created_at)
      return t >= start && t < end
    }).length
    months.push({
      label,
      gmv: slice.reduce((s, o) => s + (o.amount ?? 0), 0),
      fees: slice.filter(o => o.transfer_released).reduce((s, o) => s + (o.platform_fee_cents ?? 0), 0),
      orders: slice.length,
      shippingMarkup: mShippingMarkup,
      shippingLoss: mShippingLoss,
      newUsers: mNewUsers,
    })
  }

  return (
    <div className="p-8 max-w-6xl space-y-10">

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Finance & Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform-wide P&L, revenue streams, and KPIs.</p>
      </div>

      {/* ── Top-line P&L ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 mb-4">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Revenue" value={formatCents(totalRevenue)} sub="Fees + subs + shipping markup" icon={DollarSign} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
          <StatCard label="Transaction Fees" value={formatCents(transactionFees)} sub={`${completedOrders} completed orders`} icon={CreditCard} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard label="Subscription MRR" value={formatCents(mrr)} sub={`${tierCounts.collector_premium} Premium · ${tierCounts.dealer} Dealer`} icon={TrendingUp} color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-900/20" />
          <StatCard label="Shipping Markup" value={formatCents(shippingMarkup)} sub={`${spreadOrders} spread orders · ${flatShippingOrders} flat-rate total`} icon={Truck} color="text-cyan-600 dark:text-cyan-400" bg="bg-cyan-50 dark:bg-cyan-900/20" />
        </div>
      </section>

      {/* ── Liabilities & Risk ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 mb-4">Liabilities & Risk</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending Fees (Unrealized)" value={formatCents(pendingFees)} sub="On orders not yet released" icon={Clock} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/20" />
          <StatCard label="Pending Seller Payouts" value={formatCents(pendingPayout)} sub="Awaiting auto-release" icon={Clock} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/20" />
          <StatCard label="Funds in Dispute" value={formatCents(inDispute)} sub={`${disputedOrders} open disputes`} icon={AlertTriangle} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" />
          <StatCard label="Shipping Losses" value={shippingLosses > 0 ? `(${formatCents(shippingLosses)})` : '$0.00'} sub={`${freeShippingOrders} free-shipping labels · payout-floor gaps`} icon={TrendingDown} color="text-red-500 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" negative={shippingLosses > 0} />
        </div>
      </section>

      {/* ── Transaction KPIs ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 mb-4">Transactions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total GMV" value={formatCents(gmv)} sub={`${all.length} total orders`} icon={BarChart3} color="text-zinc-600 dark:text-zinc-400" bg="bg-zinc-100 dark:bg-zinc-800" />
          <StatCard label="Avg. Order Value" value={formatCents(avgOrderValue)} sub="All-time" icon={ShoppingBag} color="text-zinc-600 dark:text-zinc-400" bg="bg-zinc-100 dark:bg-zinc-800" />
          <StatCard label="Dispute Rate" value={`${disputeRate}%`} sub={`${disputedOrders} of ${all.length} orders`} icon={AlertTriangle} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/20" />
          <StatCard label="Active Listings" value={(activeListings ?? 0).toLocaleString()} sub="Currently live on marketplace" icon={Tag} color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20" />
        </div>
      </section>

      {/* ── User KPIs ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 mb-4">Users</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={allProfiles.length.toLocaleString()} sub="All registered accounts" icon={Users} color="text-zinc-600 dark:text-zinc-400" bg="bg-zinc-100 dark:bg-zinc-800" />
          <StatCard label="MAU (30d)" value={mau.toLocaleString()} sub="Unique buyers + sellers active" icon={Activity} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
          <StatCard label="New Users (30d)" value={newUsers30.toLocaleString()} sub="Registered in last 30 days" icon={Users} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" />
          <StatCard label="Packages Shipped" value={allShipments.length.toLocaleString()} sub="Labels purchased all-time" icon={Package} color="text-zinc-600 dark:text-zinc-400" bg="bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {/* Subscription tier breakdown */}
        <div className="mt-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Users by Subscription Tier</h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {(Object.entries(tierCounts) as [Tier, number][]).map(([tier, count]) => {
              const pct = allProfiles.length > 0 ? (count / allProfiles.length) * 100 : 0
              return (
                <div key={tier} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-zinc-700 dark:text-zinc-300">{TIER_LABEL[tier]}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{count.toLocaleString()}</div>
                  <div className="w-14 text-right text-xs text-zinc-400 tabular-nums">{pct.toFixed(1)}%</div>
                  <div className="w-24 text-right text-xs text-zinc-400">{TIER_PRICE[tier] > 0 ? `${formatCents(TIER_PRICE[tier] * count)}/mo` : '—'}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Monthly Breakdown ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 mb-4">Monthly Breakdown — Last 6 Months</h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Month</th>
                <th className="text-right px-5 py-3">Orders</th>
                <th className="text-right px-5 py-3">GMV</th>
                <th className="text-right px-5 py-3">Txn Fees</th>
                <th className="text-right px-5 py-3">Ship Markup</th>
                <th className="text-right px-5 py-3">Ship Loss</th>
                <th className="text-right px-5 py-3">New Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {months.map(m => (
                <tr key={m.label} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-3 font-medium">{m.label}</td>
                  <td className="px-5 py-3 text-right text-zinc-500 tabular-nums">{m.orders}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCents(m.gmv)}</td>
                  <td className="px-5 py-3 text-right text-green-700 dark:text-green-400 tabular-nums">{formatCents(m.fees)}</td>
                  <td className="px-5 py-3 text-right text-cyan-700 dark:text-cyan-400 tabular-nums">{formatCents(m.shippingMarkup)}</td>
                  <td className={`px-5 py-3 text-right tabular-nums ${m.shippingLoss > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}`}>
                    {m.shippingLoss > 0 ? `(${formatCents(m.shippingLoss)})` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500 tabular-nums">{m.newUsers}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-zinc-200 dark:border-zinc-700">
              <tr className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50">
                <td className="px-5 py-3">6-Month Total</td>
                <td className="px-5 py-3 text-right tabular-nums">{months.reduce((s, m) => s + m.orders, 0)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{formatCents(months.reduce((s, m) => s + m.gmv, 0))}</td>
                <td className="px-5 py-3 text-right text-green-700 dark:text-green-400 tabular-nums">{formatCents(months.reduce((s, m) => s + m.fees, 0))}</td>
                <td className="px-5 py-3 text-right text-cyan-700 dark:text-cyan-400 tabular-nums">{formatCents(months.reduce((s, m) => s + m.shippingMarkup, 0))}</td>
                <td className="px-5 py-3 text-right text-red-600 dark:text-red-400 tabular-nums">
                  {months.reduce((s, m) => s + m.shippingLoss, 0) > 0
                    ? `(${formatCents(months.reduce((s, m) => s + m.shippingLoss, 0))})`
                    : '—'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{months.reduce((s, m) => s + m.newUsers, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

    </div>
  )
}
