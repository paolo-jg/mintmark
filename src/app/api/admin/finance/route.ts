import { NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()

  const { data: orders } = await db
    .from('orders')
    .select('amount, seller_payout_cents, platform_fee_cents, transfer_released, status')

  if (!orders) return NextResponse.json({ error: 'Failed to load' }, { status: 500 })

  const allOrders = orders ?? []

  const gmv = allOrders.reduce((s, o) => s + (o.amount ?? 0), 0)

  const feesCollected = allOrders
    .filter(o => o.transfer_released)
    .reduce((s, o) => s + (o.platform_fee_cents ?? 0), 0)

  const pendingPayout = allOrders
    .filter(o => !o.transfer_released && o.status !== 'disputed' && o.seller_payout_cents)
    .reduce((s, o) => s + (o.seller_payout_cents ?? 0), 0)

  const inDispute = allOrders
    .filter(o => o.status === 'disputed')
    .reduce((s, o) => s + (o.amount ?? 0), 0)

  const disputeCount = allOrders.filter(o => o.status === 'disputed').length
  const completedCount = allOrders.filter(o => o.status === 'complete').length
  const totalOrders = allOrders.length

  const { count: userCount } = await db.from('profiles').select('id', { count: 'exact', head: true })
  const { count: listingCount } = await db.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active')

  return NextResponse.json({
    gmv,
    feesCollected,
    pendingPayout,
    inDispute,
    disputeCount,
    completedCount,
    totalOrders,
    userCount: userCount ?? 0,
    listingCount: listingCount ?? 0,
  })
}
