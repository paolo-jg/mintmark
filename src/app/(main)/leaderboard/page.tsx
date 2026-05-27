import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from './_components/leaderboard-client'

export const metadata = { title: 'Leaderboard — Pedigree Coins' }

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // Fetch completed orders (all statuses that represent real transactions)
  const { data: orders } = await supabase
    .from('orders')
    .select('seller_id, buyer_id, amount')
    .in('status', ['complete', 'delivered', 'shipped', 'label_purchased'])

  // Aggregate volumes
  const sellerVol = new Map<string, number>()
  const buyerVol = new Map<string, number>()

  for (const o of orders ?? []) {
    sellerVol.set(o.seller_id, (sellerVol.get(o.seller_id) ?? 0) + (o.amount ?? 0))
    buyerVol.set(o.buyer_id, (buyerVol.get(o.buyer_id) ?? 0) + (o.amount ?? 0))
  }

  const topSellerIds = [...sellerVol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(x => x[0])
  const topBuyerIds = [...buyerVol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(x => x[0])
  const allIds = [...new Set([...topSellerIds, ...topBuyerIds])]

  const profileMap = new Map<string, { username: string; display_name: string | null }>()
  if (allIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', allIds)
    for (const p of profiles ?? []) {
      profileMap.set(p.id, { username: p.username, display_name: p.display_name })
    }
  }

  const topSellers = topSellerIds.map((id, i) => ({
    rank: i + 1,
    id,
    name: profileMap.get(id)?.display_name || `@${profileMap.get(id)?.username || 'user'}`,
    username: profileMap.get(id)?.username || '',
    volume: sellerVol.get(id) ?? 0,
  }))

  const topBuyers = topBuyerIds.map((id, i) => ({
    rank: i + 1,
    id,
    name: profileMap.get(id)?.display_name || `@${profileMap.get(id)?.username || 'user'}`,
    username: profileMap.get(id)?.username || '',
    volume: buyerVol.get(id) ?? 0,
  }))

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top collectors and dealers ranked by trading volume.</p>
      </div>
      <LeaderboardClient topSellers={topSellers} topBuyers={topBuyers} />
    </div>
  )
}
