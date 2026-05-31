import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendShippingUpdate } from '@/lib/resend'

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const c = carrier.toLowerCase()
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  if (c.includes('dhl')) return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`
  return ''
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { trackingNumber, carrier, serviceLevel } = await req.json() as {
    trackingNumber: string
    carrier: string
    serviceLevel?: string
  }

  if (!trackingNumber?.trim() || !carrier?.trim()) {
    return NextResponse.json({ error: 'Tracking number and carrier are required' }, { status: 400 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('seller_id', user.id)
    .eq('status', 'awaiting_shipment')
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found or already shipped' }, { status: 404 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()
  // 14 days from ship date: buyer can confirm receipt (starts 3-day window) or
  // dispute any time before this. After this, payout releases automatically.
  const autoConfirmAt = new Date(Date.now() + 14 * 86400_000).toISOString()

  const { error: shipmentError } = await db.from('shipments').insert({
    order_id: orderId,
    carrier,
    service_level: serviceLevel || carrier,
    tracking_number: trackingNumber.trim(),
    tracking_status: 'pre_transit',
    label_purchased_at: now,
    shipped_at: now,
  })

  if (shipmentError) return NextResponse.json({ error: shipmentError.message }, { status: 500 })

  await db.from('orders').update({
    status: 'shipped',
    auto_confirm_at: autoConfirmAt,
    updated_at: now,
  }).eq('id', orderId)

  // Fire-and-forget shipping email to buyer
  void (async () => {
    try {
      const [{ data: authData }, { data: listing }] = await Promise.all([
        db.auth.admin.getUserById(order.buyer_id),
        db.from('listings').select('coin_name').eq('id', order.listing_id).single(),
      ])
      const buyerEmail = authData.user?.email
      if (buyerEmail) {
        await sendShippingUpdate({
          to: buyerEmail,
          buyerName: buyerEmail.split('@')[0],
          listingTitle: listing?.coin_name ?? 'your order',
          trackingNumber: trackingNumber.trim(),
          trackingUrl: getTrackingUrl(carrier, trackingNumber.trim()),
          carrier,
        })
      }
    } catch { /* non-critical */ }
  })()

  return NextResponse.json({ ok: true })
}
