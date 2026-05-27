export const dynamic = 'force-dynamic'

import { getServiceDb } from '@/lib/admin'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  open:       'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  approved:   'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  label_sent: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400',
  received:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  refunded:   'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  rejected:   'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  closed:     'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const REASON_LABELS: Record<string, string> = {
  not_as_described: 'Not As Described',
  changed_mind:     'Changed Mind',
  damaged:          'Arrived Damaged',
  wrong_item:       'Wrong Item',
  other:            'Other',
}

const STATUSES = ['', 'open', 'approved', 'label_sent', 'received', 'refunded', 'rejected', 'closed']

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = '', page = '1' } = await searchParams
  const db = getServiceDb()
  const limit = 50
  const offset = (parseInt(page) - 1) * limit

  let query = db
    .from('returns')
    .select(`
      id, reason, status, refund_amount_cents, created_at,
      filed_by_profile:profiles!returns_filed_by_fkey(username, email),
      order:orders!returns_order_id_fkey(
        id, amount,
        seller:profiles!orders_seller_id_fkey(username),
        listing:listings!orders_listing_id_fkey(title)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data: returns, count } = await query
  const total = count ?? 0
  const currentPage = parseInt(page)
  const totalPages = Math.ceil(total / limit)

  const fmtCents = (c: number) =>
    (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Returns</h1>
          <p className="text-sm text-zinc-500 mt-1">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => (
            <a
              key={s}
              href={`?status=${s}`}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                status === s
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {s ? s.replace(/_/g, ' ') : 'All'}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Listing</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Seller</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Order</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Refund</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Filed</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(returns ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-400">No returns found</td>
                </tr>
              )}
              {(returns ?? []).map((r: any) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-40">{r.order?.listing?.title ?? 'Unknown'}</p>
                    <p className="text-xs text-zinc-400 font-mono">#{r.order?.id?.slice(0, 8).toUpperCase()}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{r.filed_by_profile?.username}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{r.order?.seller?.username}</td>
                  <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">{REASON_LABELS[r.reason] ?? r.reason}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">{r.order?.amount ? fmtCents(r.order.amount) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 tabular-nums">
                    {r.refund_amount_cents ? fmtCents(r.refund_amount_cents) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/returns/${r.id}`}
                      className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      Review
                    </Link>
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
                <a href={`?status=${status}&page=${currentPage - 1}`} className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">Previous</a>
              )}
              {currentPage < totalPages && (
                <a href={`?status=${status}&page=${currentPage + 1}`} className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">Next</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
