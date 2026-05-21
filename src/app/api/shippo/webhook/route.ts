import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    autoConfirmAt.setDate(autoConfirmAt.getDate() + 7)

    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        auto_confirm_at: autoConfirmAt.toISOString(),
        updated_at: now,
      })
      .eq('id', shipment.order_id)
  } else if (internalStatus === 'transit') {
    await supabase
      .from('orders')
      .update({ status: 'shipped', updated_at: now })
      .eq('id', shipment.order_id)
      .eq('status', 'label_purchased')
  }

  return NextResponse.json({ received: true })
}
