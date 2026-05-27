import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import { AlertTriangle, Users, ShoppingCart, Tag, DollarSign, Clock } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const db = getServiceDb()

  const [
    { count: totalUsers },
    { count: activeListings },
    { count: totalOrders },
    { data: gmvData },
    { count: openDisputes },
    { count: pendingPayouts },
    { data: pendingPayoutValue },
    { data: recentOrders },
    { data: recentDisputes },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('orders').select('amount').eq('status', 'complete'),
    db.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered').eq('transfer_released', false),
    db.from('orders').select('seller_payout_cents').eq('status', 'delivered').eq('transfer_released', false),
    db.from('orders')
      .select('id, amount, status, created_at, buyer:profiles!orders_buyer_id_fkey(username), listing:listings!orders_listing_id_fkey(title)')
      .order('created_at', { ascending: false })
      .limit(5),
    db.from('disputes')
      .select('id, reason, status, created_at, filed_by_profile:profiles!disputes_filed_by_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    activeListings: activeListings ?? 0,
    totalOrders: totalOrders ?? 0,
    gmvCents: (gmvData ?? []).reduce((s, o) => s + (o.amount ?? 0), 0),
    openDisputes: openDisputes ?? 0,
    pendingPayouts: pendingPayouts ?? 0,
    pendingPayoutCents: (pendingPayoutValue ?? []).reduce((s, o) => s + (o.seller_payout_cents ?? 0), 0),
    recentOrders: recentOrders ?? [],
    recentDisputes: recentDisputes ?? [],
  }
}

const STATUS_COLORS: Record<string, string> = {
  awaiting_shipment: 'bg-yellow-100 text-yellow-800',
  label_purchased: 'bg-blue-100 text-blue-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  complete: 'bg-zinc-100 text-zinc-700',
  open: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved_buyer: 'bg-green-100 text-green-800',
  resolved_seller: 'bg-green-100 text-green-800',
  closed: 'bg-zinc-100 text-zinc-700',
}

export default async function AdminOverviewPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, href: '/admin/users', color: 'text-blue-600' },
    { label: 'Active Listings', value: stats.activeListings.toLocaleString(), icon: Tag, href: '/admin/listings', color: 'text-violet-600' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), icon: ShoppingCart, href: '/admin/orders', color: 'text-emerald-600' },
    { label: 'Total GMV', value: formatCents(stats.gmvCents), icon: DollarSign, href: '/admin/orders', color: 'text-emerald-600' },
    { label: 'Open Disputes', value: stats.openDisputes.toLocaleString(), icon: AlertTriangle, href: '/admin/disputes', color: 'text-red-600', alert: stats.openDisputes > 0 },
    { label: 'Pending Payouts', value: `${stats.pendingPayouts} (${formatCents(stats.pendingPayoutCents)})`, icon: Clock, href: '/admin/orders?status=delivered', color: 'text-yellow-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Platform Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Real-time snapshot of Pedigree Coins activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {cards.map(({ label, value, icon: Icon, href, color, alert }) => (
          <Link
            key={label}
            href={href}
            className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 flex items-start gap-4 hover:shadow-sm transition-shadow ${
              alert ? 'border-red-200 dark:border-red-900' : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className={`mt-0.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">View all</Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stats.recentOrders.length === 0 && (
              <p className="px-5 py-6 text-sm text-zinc-400 text-center">No orders yet</p>
            )}
            {stats.recentOrders.map((o: any) => (
              <Link key={o.id} href={`/admin/orders`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{(o.listing as any)?.title ?? 'Unknown'}</p>
                  <p className="text-xs text-zinc-400">{(o.buyer as any)?.username} · {new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {o.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatCents(o.amount)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Disputes */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Disputes</h2>
            <Link href="/admin/disputes" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">View all</Link>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stats.recentDisputes.length === 0 && (
              <p className="px-5 py-6 text-sm text-zinc-400 text-center">No disputes yet</p>
            )}
            {stats.recentDisputes.map((d: any) => (
              <Link key={d.id} href={`/admin/disputes/${d.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">{d.reason.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-zinc-400">{(d.filed_by_profile as any)?.username} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${STATUS_COLORS[d.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {d.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
