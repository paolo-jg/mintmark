import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import UserActions from '../_components/user-actions'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = '', page = '1' } = await searchParams
  const db = getServiceDb()
  const limit = 50
  const offset = (parseInt(page) - 1) * limit

  let query = db
    .from('profiles')
    .select('id, email, username, display_name, subscription_tier, is_admin, suspended, suspended_reason, created_at, completed_orders_count, average_rating', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.or(`email.ilike.%${q}%,username.ilike.%${q}%`)

  const { data: users, count } = await query

  const total = count ?? 0
  const totalPages = Math.ceil(total / limit)
  const currentPage = parseInt(page)

  const TIER_LABELS: Record<string, string> = {
    collector_basic: 'Basic',
    collector_premium: 'Premium',
    dealer: 'Dealer',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">{total.toLocaleString()} total users</p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email or username..."
            className="h-9 px-3 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 w-64"
          />
          <button type="submit" className="h-9 px-4 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">User</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Tier</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Orders</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Rating</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(users ?? []).map((u) => (
                <tr key={u.id} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${u.suspended ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <a href={`/admin/users/${u.id}`} className="block hover:underline underline-offset-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {u.display_name || u.username}
                        {u.is_admin && (
                          <span className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0.5 rounded font-medium">admin</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-400">{u.email}</p>
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                      {TIER_LABELS[u.subscription_tier ?? 'collector_basic'] ?? u.subscription_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.completed_orders_count ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {u.average_rating ? `${Number(u.average_rating).toFixed(1)} ★` : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.suspended ? (
                      <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Suspended</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActions user={u} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <a href={`?q=${q}&page=${currentPage - 1}`} className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Previous
                </a>
              )}
              {currentPage < totalPages && (
                <a href={`?q=${q}&page=${currentPage + 1}`} className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
