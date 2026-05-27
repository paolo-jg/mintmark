import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReturnResolveForm from '../../_components/return-resolve-form'

const REASON_LABELS: Record<string, string> = {
  not_as_described: 'Not As Described',
  changed_mind:     'Changed Mind',
  damaged:          'Arrived Damaged',
  wrong_item:       'Wrong Item',
  other:            'Other',
}

export default async function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getServiceDb()

  const { data: ret, error } = await db
    .from('returns')
    .select(`
      *,
      filed_by_profile:profiles!returns_filed_by_fkey(id, email, username),
      resolved_by_profile:profiles!returns_resolved_by_fkey(email, username),
      order:orders!returns_order_id_fkey(
        id, amount, status, created_at,
        buyer:profiles!orders_buyer_id_fkey(id, email, username),
        seller:profiles!orders_seller_id_fkey(id, email, username),
        listing:listings!orders_listing_id_fkey(id, title, coin_name, images, grade, grading_service)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !ret) notFound()

  const order = (ret as any).order
  const listing = order?.listing
  const buyer = order?.buyer
  const seller = order?.seller

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/returns" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          Returns
        </Link>
        <span className="text-zinc-300 dark:text-zinc-600">/</span>
        <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">#{id.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Return Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Reason</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{REASON_LABELS[(ret as any).reason] ?? (ret as any).reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Filed by</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{(ret as any).filed_by_profile?.username} ({(ret as any).filed_by_profile?.email})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Filed</span>
                <span className="text-zinc-700 dark:text-zinc-300">{new Date((ret as any).created_at).toLocaleString()}</span>
              </div>
              {(ret as any).refund_amount_cents && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Refund amount</span>
                  <span className="font-semibold text-green-700 dark:text-green-400">{formatCents((ret as any).refund_amount_cents)}</span>
                </div>
              )}
              {(ret as any).resolved_at && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Resolved</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{new Date((ret as any).resolved_at).toLocaleString()} by {(ret as any).resolved_by_profile?.username}</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1.5">Buyer's description</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{(ret as any).description}</p>
            </div>
            {(ret as any).admin_notes && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1.5">Admin notes</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{(ret as any).admin_notes}</p>
              </div>
            )}
          </div>

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

        <div>
          <ReturnResolveForm ret={ret as any} orderAmountCents={order?.amount ?? 0} />
        </div>
      </div>
    </div>
  )
}
