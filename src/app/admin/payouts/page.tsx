import { getServiceDb } from '@/lib/admin'
import { formatCents } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import PayoutAction from './_components/payout-action'

export default async function AdminPayoutsPage() {
  const db = getServiceDb()

  const { data: rawOrders } = await db
    .from('orders')
    .select('id, amount, seller_payout_cents, platform_fee_cents, transfer_released, transfer_id, status, auto_confirm_at, created_at, updated_at, buyer_id, seller_id, listing_id, stripe_payment_intent_id')
    .in('status', ['disputed', 'delivered', 'shipped', 'complete', 'label_purchased'])
    .order('updated_at', { ascending: false })
    .limit(200)

  const orders = rawOrders ?? []

  const profileIds = [...new Set([...orders.map(o => o.buyer_id), ...orders.map(o => o.seller_id)])]
  const { data: profiles } = await db.from('profiles').select('id, stripe_account_id, stripe_onboarding_complete').in('id', profileIds)
  const listingIds = [...new Set(orders.map(o => o.listing_id))]
  const { data: listings } = await db.from('listings').select('id, coin_name').in('id', listingIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const listingMap = Object.fromEntries((listings ?? []).map(l => [l.id, l]))

  const enriched = orders.map(o => ({
    ...o,
    seller_stripe_ready: profileMap[o.seller_id]?.stripe_onboarding_complete ?? false,
    coin_name: listingMap[o.listing_id]?.coin_name ?? 'Unknown',
  }))

  const disputed = enriched.filter(o => o.status === 'disputed')
  const pending = enriched.filter(o => o.status !== 'disputed' && !o.transfer_released)
  const completed = enriched.filter(o => o.transfer_released)

  function statusBadge(o: typeof enriched[0]) {
    if (o.status === 'disputed') return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Disputed</Badge>
    if (o.transfer_released) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Released</Badge>
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
  }

  function OrderTable({ rows, showActions }: { rows: typeof enriched; showActions: boolean }) {
    if (!rows.length) return <p className="text-sm text-zinc-500 py-4">None.</p>
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
              <th className="text-left py-2 pr-4">Order</th>
              <th className="text-left py-2 pr-4">Coin</th>
              <th className="text-right py-2 pr-4">Sale</th>
              <th className="text-right py-2 pr-4">Seller Payout</th>
              <th className="text-right py-2 pr-4">Fee</th>
              <th className="text-left py-2 pr-4">Auto-confirm</th>
              <th className="text-left py-2 pr-4">Status</th>
              {showActions && <th className="text-right py-2">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map(o => (
              <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="py-3 pr-4 font-mono text-xs text-zinc-500">{o.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-3 pr-4 max-w-[180px] truncate">{o.coin_name}</td>
                <td className="py-3 pr-4 text-right">{formatCents(o.amount)}</td>
                <td className="py-3 pr-4 text-right">{o.seller_payout_cents ? formatCents(o.seller_payout_cents) : '—'}</td>
                <td className="py-3 pr-4 text-right text-green-700 dark:text-green-400">{o.platform_fee_cents ? formatCents(o.platform_fee_cents) : '—'}</td>
                <td className="py-3 pr-4 text-xs text-zinc-500">
                  {o.auto_confirm_at ? new Date(o.auto_confirm_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}
                </td>
                <td className="py-3 pr-4">{statusBadge(o)}</td>
                {showActions && (
                  <td className="py-3 text-right">
                    <PayoutAction
                      orderId={o.id}
                      status={o.status}
                      sellerStripeReady={o.seller_stripe_ready}
                      transferReleased={o.transfer_released}
                      hasPayout={!!o.seller_payout_cents}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Payout Management</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Funds are released automatically 48h after delivery. Disputed orders are held until resolved manually.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Disputed — Needs Decision</h2>
            {disputed.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {disputed.length}
              </span>
            )}
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4">
            <OrderTable rows={disputed} showActions />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Pending Auto-Release</h2>
            <span className="text-xs text-zinc-500">Releases automatically when auto_confirm_at passes</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4">
            <OrderTable rows={pending} showActions />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Completed Payouts</h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4">
            <OrderTable rows={completed} showActions={false} />
          </div>
        </section>
      </div>
    </div>
  )
}
