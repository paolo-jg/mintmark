export const dynamic = 'force-dynamic'

import { getServiceDb } from '@/lib/admin'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getServiceDb()

  const [{ data: profile }, { data: authData }, { data: orders }, { data: listings }, { data: disputes }] = await Promise.all([
    db.from('profiles').select('*').eq('id', id).single(),
    db.auth.admin.getUserById(id),
    db.from('orders').select('id, amount, status, created_at, listing_id, buyer_id').or(`buyer_id.eq.${id},seller_id.eq.${id}`).order('created_at', { ascending: false }).limit(50),
    db.from('listings').select('id, coin_name, status, price, created_at').eq('seller_id', id).order('created_at', { ascending: false }).limit(50),
    db.from('disputes').select('id, reason, status, created_at, order_id').eq('filed_by', id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!profile) notFound()

  const email = authData.user?.email ?? '—'
  const joinedAt = authData.user?.created_at ? new Date(authData.user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
  const lastSeen = authData.user?.last_sign_in_at ? new Date(authData.user.last_sign_in_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/admin/users" className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6 inline-block">&larr; Back to Users</Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{email}</h1>
          <p className="text-sm text-zinc-500 mt-0.5 font-mono">{id}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile.is_admin && <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Admin</Badge>}
          {profile.suspended && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Suspended</Badge>}
          <Badge variant="outline">{profile.subscription_tier ?? 'free'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Joined', value: joinedAt },
          { label: 'Last Seen', value: lastSeen },
          { label: 'Orders', value: (orders ?? []).length },
          { label: 'Listings', value: (listings ?? []).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      {profile.suspended && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Account Suspended</p>
          {profile.suspended_reason && <p className="text-xs text-zinc-500 mt-0.5">{profile.suspended_reason}</p>}
          {profile.suspended_at && <p className="text-xs text-zinc-400 mt-0.5">Since {new Date(profile.suspended_at).toLocaleDateString()}</p>}
        </div>
      )}

      <div className="space-y-8">
        {/* Orders */}
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Orders</h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            {(orders ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500 px-5 py-4">No orders.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                    <th className="text-left px-5 py-2">Order</th>
                    <th className="text-left px-5 py-2">Role</th>
                    <th className="text-right px-5 py-2">Amount</th>
                    <th className="text-left px-5 py-2">Status</th>
                    <th className="text-left px-5 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(orders ?? []).map(o => (
                    <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-5 py-3 font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3 text-xs text-zinc-500">{o.buyer_id === id ? 'Buyer' : 'Seller'}</td>
                      <td className="px-5 py-3 text-right">{formatCents(o.amount)}</td>
                      <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{o.status}</Badge></td>
                      <td className="px-5 py-3 text-xs text-zinc-500">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Listings */}
        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Listings</h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            {(listings ?? []).length === 0 ? (
              <p className="text-sm text-zinc-500 px-5 py-4">No listings.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                    <th className="text-left px-5 py-2">Coin</th>
                    <th className="text-right px-5 py-2">Price</th>
                    <th className="text-left px-5 py-2">Status</th>
                    <th className="text-left px-5 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(listings ?? []).map(l => (
                    <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-5 py-3 max-w-[220px] truncate">{l.coin_name}</td>
                      <td className="px-5 py-3 text-right">{formatCents(l.price)}</td>
                      <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{l.status}</Badge></td>
                      <td className="px-5 py-3 text-xs text-zinc-500">{new Date(l.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Disputes */}
        {(disputes ?? []).length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Disputes Filed</h2>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                    <th className="text-left px-5 py-2">Order</th>
                    <th className="text-left px-5 py-2">Reason</th>
                    <th className="text-left px-5 py-2">Status</th>
                    <th className="text-left px-5 py-2">Filed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(disputes ?? []).map(d => (
                    <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-5 py-3 font-mono text-xs">{d.order_id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3 text-xs">{d.reason.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{d.status}</Badge></td>
                      <td className="px-5 py-3 text-xs text-zinc-500">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
