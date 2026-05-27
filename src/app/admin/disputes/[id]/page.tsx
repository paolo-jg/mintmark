import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DisputeResolveForm from '../../_components/dispute-resolve-form'

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getServiceDb()

  const { data: dispute, error } = await db
    .from('disputes')
    .select(`
      *,
      filed_by_profile:profiles!disputes_filed_by_fkey(id, email, username),
      resolved_by_profile:profiles!disputes_resolved_by_fkey(email, username),
      order:orders!disputes_order_id_fkey(
        id, amount, status, created_at,
        buyer:profiles!orders_buyer_id_fkey(id, email, username),
        seller:profiles!orders_seller_id_fkey(id, email, username),
        listing:listings!orders_listing_id_fkey(id, title, coin_name, images, grade, grading_service)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !dispute) notFound()

  const order = (dispute as any).order
  const listing = order?.listing
  const buyer = order?.buyer
  const seller = order?.seller

  const REASON_LABELS: Record<string, string> = {
    item_not_received: 'Item Not Received',
    item_not_as_described: 'Item Not As Described',
    counterfeit: 'Counterfeit Coin',
    unauthorized_purchase: 'Unauthorized Purchase',
    other: 'Other',
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/disputes" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          Disputes
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">#{id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: dispute info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Dispute details */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Dispute Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Reason</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{REASON_LABELS[(dispute as any).reason] ?? (dispute as any).reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Filed by</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{(dispute as any).filed_by_profile?.username} ({(dispute as any).filed_by_profile?.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Filed</span>
                <span className="text-zinc-700 dark:text-zinc-300">{new Date((dispute as any).created_at).toLocaleString()}</span>
              </div>
              {(dispute as any).resolved_at && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Resolved</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{new Date((dispute as any).resolved_at).toLocaleString()} by {(dispute as any).resolved_by_profile?.username}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1.5">Description from buyer</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{(dispute as any).description}</p>
            </div>
            {(dispute as any).evidence_urls?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Evidence</p>
                <div className="flex flex-wrap gap-2">
                  {(dispute as any).evidence_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-blue-600 dark:text-blue-400">
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order info */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Order</h2>
            <div className="flex gap-4 mb-4">
              {listing?.images?.[0] && (
                <img src={listing.images[0]} alt="" className="h-16 w-16 rounded-lg object-cover bg-zinc-100 shrink-0" />
              )}
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{listing?.title}</p>
                {listing?.coin_name && <p className="text-xs text-zinc-400">{listing.coin_name}</p>}
                {listing?.grade && <p className="text-xs text-zinc-400">{listing.grading_service} {listing.grade}</p>}
              </div>
            </div>
            <div className="space-y-2 text-sm border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div className="flex justify-between">
                <span className="text-zinc-500">Order ID</span>
                <Link href={`/orders/${order?.id}`} className="font-mono text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                  #{order?.id?.slice(0, 8).toUpperCase()}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCents(order?.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Order status</span>
                <span className="text-zinc-700 dark:text-zinc-300 capitalize">{order?.status?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            {[{ label: 'Buyer', person: buyer }, { label: 'Seller', person: seller }].map(({ label, person }) => (
              <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400 mb-1">{label}</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{person?.username}</p>
                <p className="text-xs text-zinc-400 truncate">{person?.email}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: resolution */}
        <div>
          <DisputeResolveForm dispute={dispute as any} />
        </div>
      </div>
    </div>
  )
}
