import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  awaiting_shipment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  label_purchased: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  disputed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  complete: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const STATUSES = ['', 'awaiting_shipment', 'shipped', 'delivered', 'disputed', 'complete']

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = '', page = '1' } = await searchParams
  const db = getServiceDb()
  const limit = 50
  const offset = (parseInt(page) - 1) * limit

  let query = db
    .from('orders')
    .select(`
      id, amount, status, seller_payout_cents, platform_fee_cents, transfer_released, created_at,
      buyer:profiles!orders_buyer_id_fkey(email, username),
      seller:profiles!orders_seller_id_fkey(email, username),
      listing:listings!orders_listing_id_fkey(title)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)

  const { data: orders, count } = await query
  const total = count ?? 0
  const currentPage = parseInt(page)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">{total.toLocaleString()} orders</p>
        </div>
        <div className="flex gap-1">
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
              {s || 'All'}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Order</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Buyer</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Seller</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Payout</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Fee</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(orders ?? []).map((o: any) => (
                <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <p className="text-xs text-zinc-400 truncate max-w-32">{o.listing?.title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{o.buyer?.username}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">{o.seller?.username}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{formatCents(o.amount)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {o.seller_payout_cents ? formatCents(o.seller_payout_cents) : '—'}
                    {o.transfer_released && <span className="ml-1 text-xs text-green-600">paid</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{o.platform_fee_cents ? formatCents(o.platform_fee_cents) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
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
