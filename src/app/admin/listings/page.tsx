export const dynamic = 'force-dynamic'

import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import Link from 'next/link'
import ListingStatusAction from '../_components/listing-status-action'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  sold: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
}

const STATUSES = ['', 'active', 'draft', 'sold', 'expired']

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}) {
  const { status = '', q = '', page = '1' } = await searchParams
  const db = getServiceDb()
  const limit = 50
  const offset = (parseInt(page) - 1) * limit

  let query = db
    .from('listings')
    .select(`
      id, title, coin_name, price, status, verification_status, created_at,
      seller:profiles!listings_seller_id_fkey(email, username)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (q) query = query.ilike('title', `%${q}%`)

  const { data: listings, count } = await query
  const total = count ?? 0
  const currentPage = parseInt(page)
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Listings</h1>
          <p className="text-sm text-zinc-500 mt-1">{total.toLocaleString()} listings</p>
        </div>
        <div className="flex items-center gap-3">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search title..." className="h-8 px-3 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 w-48" />
            <button type="submit" className="h-8 px-3 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg">Search</button>
          </form>
          <div className="flex gap-1">
            {STATUSES.map(s => (
              <a key={s} href={`?status=${s}&q=${q}`} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${status === s ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                {s || 'All'}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Listing</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Seller</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Price</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Listed</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(listings ?? []).map((l: any) => (
                <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-48">{l.title}</p>
                    {l.coin_name && <p className="text-xs text-zinc-400">{l.coin_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{(l.seller as any)?.username}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{l.price ? formatCents(l.price) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/listings/${l.id}`} className="text-xs px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        View
                      </Link>
                      <ListingStatusAction id={l.id} currentStatus={l.status} />
                    </div>
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
              {currentPage > 1 && <a href={`?status=${status}&q=${q}&page=${currentPage - 1}`} className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">Previous</a>}
              {currentPage < totalPages && <a href={`?status=${status}&q=${q}&page=${currentPage + 1}`} className="text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800">Next</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
