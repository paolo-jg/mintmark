import { NextResponse } from 'next/server'
import { requireAdmin, getServiceDb } from '@/lib/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const db = getServiceDb()

  const [
    { count: totalUsers },
    { count: activeListings },
    { count: totalOrders },
    { data: gmvData },
    { count: openDisputes },
    { count: pendingPayouts },
    { data: pendingPayoutValue },
    { data: platformPaused },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('orders').select('amount').eq('status', 'complete'),
    db.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('orders').select('*', { count: 'exact', head: true })
      .eq('status', 'delivered').eq('transfer_released', false),
    db.from('orders').select('seller_payout_cents')
      .eq('status', 'delivered').eq('transfer_released', false),
    db.from('platform_settings').select('value').eq('key', 'platform_paused').single(),
  ])

  const gmv = (gmvData ?? []).reduce((sum, o) => sum + (o.amount ?? 0), 0)
  const pendingPayoutCents = (pendingPayoutValue ?? []).reduce((sum, o) => sum + (o.seller_payout_cents ?? 0), 0)

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeListings: activeListings ?? 0,
    totalOrders: totalOrders ?? 0,
    gmvCents: gmv,
    openDisputes: openDisputes ?? 0,
    pendingPayouts: pendingPayouts ?? 0,
    pendingPayoutCents,
    platformPaused: platformPaused?.value === true,
  })
}
