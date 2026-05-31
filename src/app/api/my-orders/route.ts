import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [ordersResult, bidsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, amount, created_at, listing_id, listings(coin_name, grading_service_image_url, year, grade, grading_service), shipments(tracking_status, tracking_number, carrier)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('bids')
      .select('id, amount, created_at, hold_status, auction_id, auctions(id, end_time, current_bid, start_price, bid_count, listings(id, coin_name, grading_service_image_url, year, grade, grading_service))')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return NextResponse.json({
    orders: ordersResult.data ?? [],
    bids: bidsResult.data ?? [],
  })
}
