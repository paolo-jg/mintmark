import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getServiceDb } from '@/lib/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()

  const { data: orders } = await db
    .from('orders')
    .select('id, amount, seller_payout_cents, platform_fee_cents, transfer_released, transfer_id, status, auto_confirm_at, created_at, updated_at, buyer_id, seller_id, listing_id, stripe_payment_intent_id')
    .in('status', ['disputed', 'delivered', 'complete', 'shipped'])
    .order('updated_at', { ascending: false })
    .limit(200)

  if (!orders) return NextResponse.json({ orders: [] })

  const profileIds = [...new Set([...orders.map(o => o.buyer_id), ...orders.map(o => o.seller_id)])]
  const { data: profiles } = await db
    .from('profiles')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .in('id', profileIds)

  const listingIds = [...new Set(orders.map(o => o.listing_id))]
  const { data: listings } = await db
    .from('listings')
    .select('id, coin_name')
    .in('id', listingIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const listingMap = Object.fromEntries((listings ?? []).map(l => [l.id, l]))

  const enriched = orders.map(o => ({
    ...o,
    seller_stripe_ready: profileMap[o.seller_id]?.stripe_onboarding_complete ?? false,
    seller_stripe_account: profileMap[o.seller_id]?.stripe_account_id ?? null,
    coin_name: listingMap[o.listing_id]?.coin_name ?? 'Unknown',
  }))

  return NextResponse.json({ orders: enriched })
}
