import { getServiceDb } from '@/lib/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getServiceDb()
  const STATUSES = ['complete', 'delivered', 'shipped', 'label_purchased']

  const [{ data: sellerRows }, { data: buyerRows }] = await Promise.all([
    db.from('orders').select('seller_id, amount').in('status', STATUSES),
    db.from('orders').select('buyer_id, amount').in('status', STATUSES),
  ])

  const sellerVol = new Map<string, number>()
  const buyerVol = new Map<string, number>()
  for (const o of sellerRows ?? []) sellerVol.set(o.seller_id, (sellerVol.get(o.seller_id) ?? 0) + (o.amount ?? 0))
  for (const o of buyerRows ?? []) buyerVol.set(o.buyer_id, (buyerVol.get(o.buyer_id) ?? 0) + (o.amount ?? 0))

  const topSellerIds = [...sellerVol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100).map(x => x[0])
  const topBuyerIds = [...buyerVol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100).map(x => x[0])
  const allIds = [...new Set([...topSellerIds, ...topBuyerIds])]

  const profileMap = new Map<string, { username: string; display_name: string | null }>()
  if (allIds.length > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, username, display_name')
      .in('id', allIds)
    for (const p of profiles ?? []) profileMap.set(p.id, { username: p.username, display_name: p.display_name })
  }

  const fmt = (id: string, rank: number, vol: Map<string, number>) => ({
    rank,
    id,
    name: profileMap.get(id)?.display_name || `@${profileMap.get(id)?.username || 'user'}`,
    username: profileMap.get(id)?.username || '',
    volume: vol.get(id) ?? 0,
  })

  return NextResponse.json({
    topSellers: topSellerIds.map((id, i) => fmt(id, i + 1, sellerVol)),
    topBuyers: topBuyerIds.map((id, i) => fmt(id, i + 1, buyerVol)),
  }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  })
}
