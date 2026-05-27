import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import { DollarSign, TrendingUp, Clock, AlertTriangle, Users, Tag } from 'lucide-react'

export default async function AdminFinancePage() {
  const db = getServiceDb()

  const { data: orders } = await db
    .from('orders')
    .select('amount, seller_payout_cents, platform_fee_cents, transfer_released, status, created_at')

  const { count: userCount } = await db.from('profiles').select('id', { count: 'exact', head: true })
  const { count: activeListings } = await db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active')

  const all = orders ?? []

  const gmv = all.reduce((s, o) => s + (o.amount ?? 0), 0)
  const feesCollected = all.filter(o => o.transfer_released).reduce((s, o) => s + (o.platform_fee_cents ?? 0), 0)
  const pendingPayout = all.filter(o => !o.transfer_released && o.status !== 'disputed' && o.seller_payout_cents).reduce((s, o) => s + (o.seller_payout_cents ?? 0), 0)
  const inDispute = all.filter(o => o.status === 'disputed').reduce((s, o) => s + (o.amount ?? 0), 0)
  const completedOrders = all.filter(o => o.transfer_released).length
  const disputedOrders = all.filter(o => o.status === 'disputed').length

  // Monthly breakdown (last 6 months)
  const now = new Date()
  const months: { label: string; gmv: number; fees: number; orders: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const slice = all.filter(o => {
      const t = new Date(o.created_at)
      return t >= d && t < next
    })
    months.push({
      label,
      gmv: slice.reduce((s, o) => s + (o.amount ?? 0), 0),
      fees: slice.filter(o => o.transfer_released).reduce((s, o) => s + (o.platform_fee_cents ?? 0), 0),
      orders: slice.length,
    })
  }

  const cards = [
    { label: 'Total GMV', value: formatCents(gmv), sub: `${all.length} total orders`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Platform Fees Collected', value: formatCents(feesCollected), sub: `${completedOrders} completed orders`, icon: DollarSign, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Pending Seller Payouts', value: formatCents(pendingPayout), sub: 'Awaiting auto-confirm', icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Funds in Dispute', value: formatCents(inDispute), sub: `${disputedOrders} disputed orders`, icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Total Users', value: (userCount ?? 0).toLocaleString(), sub: 'Registered accounts', icon: Users, color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800' },
    { label: 'Active Listings', value: (activeListings ?? 0).toLocaleString(), sub: 'Currently live', icon: Tag, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Financial Summary</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform-wide financial overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${bg} mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Monthly Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Month</th>
              <th className="text-right px-5 py-3">Orders</th>
              <th className="text-right px-5 py-3">GMV</th>
              <th className="text-right px-5 py-3">Fees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {months.map(m => (
              <tr key={m.label} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-5 py-3 font-medium">{m.label}</td>
                <td className="px-5 py-3 text-right text-zinc-500">{m.orders}</td>
                <td className="px-5 py-3 text-right">{formatCents(m.gmv)}</td>
                <td className="px-5 py-3 text-right text-green-700 dark:text-green-400">{formatCents(m.fees)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
