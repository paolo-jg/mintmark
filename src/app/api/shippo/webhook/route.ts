import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPackageDelivered } from '@/lib/resend'
import type { TrackingStatus } from '@/types'

// Maps Shippo tracking statuses to our internal statuses
const TRACKING_STATUS_MAP: Record<string, TrackingStatus> = {
  PRE_TRANSIT: 'pre_transit',
  TRANSIT: 'transit',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  FAILURE: 'failure',
  UNKNOWN: 'unknown',
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  // Verify Shippo webhook signature
  const shippoSignature = request.headers.get('shippo-webhook-signature') ?? ''
  const secret = process.env.SHIPPO_WEBHOOK_SECRET ?? ''

  if (secret) {
    const { createHmac } = await import('crypto')
    const expected = createHmac('sha256', secret).update(body).digest('hex')
    if (shippoSignature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = JSON.parse(body)

  // Only handle tracking updates
  if (event.event !== 'track_updated') {
    return NextResponse.json({ received: true })
  }

  const tracking = event.data
  const trackingNumber: string = tracking.trackingNumber
  const shippoStatus: string = tracking.trackingStatus?.status ?? 'UNKNOWN'
  const internalStatus = TRACKING_STATUS_MAP[shippoStatus] ?? 'unknown'

  const supabase = await createClient()

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, order_id')
    .eq('tracking_number', trackingNumber)
    .single()

  if (!shipment) {
    return NextResponse.json({ received: true })
  }

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = {
    tracking_status: internalStatus,
    updated_at: now,
  }

  if (internalStatus === 'transit' || internalStatus === 'delivered') {
    updateData.shipped_at = updateData.shipped_at ?? now
  }

  if (internalStatus === 'delivered') {
    updateData.delivered_at = now
  }

  await supabase.from('shipments').update(updateData).eq('id', shipment.id)

  // Update order status on delivery
  if (internalStatus === 'delivered') {
    const autoConfirmAt = new Date()
    autoConfirmAt.setTime(autoConfirmAt.getTime() + 48 * 60 * 60 * 1000)

    const { data: order } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        auto_confirm_at: autoConfirmAt.toISOString(),
        updated_at: now,
      })
      .eq('id', shipment.order_id)
      .select('buyer_id, listing_id')
      .single()

    // Fire-and-forget delivery email to buyer
    if (order?.buyer_id) {
      void (async () => {
        try {
          const db = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          const [{ data: authData }, { data: listing }] = await Promise.all([
            db.auth.admin.getUserById(order.buyer_id),
            db.from('listings').select('coin_name').eq('id', order.listing_id).single(),
          ])
          const buyerEmail = authData.user?.email
          if (buyerEmail) {
            await sendPackageDelivered({
              to: buyerEmail,
              buyerName: buyerEmail.split('@')[0],
              listingTitle: listing?.coin_name ?? 'your order',
            })
          }
        } catch { /* non-critical */ }
      })()
    }
  } else if (internalStatus === 'transit') {
    await supabase
      .from('orders')
      .update({ status: 'shipped', updated_at: now })
      .eq('id', shipment.order_id)
      .eq('status', 'label_purchased')
  }

  return NextResponse.json({ received: true })
}
