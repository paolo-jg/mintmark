import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { purchaseLabel, requiresInsurance } from '@/lib/shippo'
import { sendShippingUpdate } from '@/lib/resend'


export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    orderId,
    rateObjectId,
    carrier,
    serviceLevel,
    rateAmountCents,
    estimatedDays,
    shippoShipmentId,
    weightOz,
    lengthIn,
    widthIn,
    heightIn,
  } = body as {
    orderId: string
    rateObjectId: string
    carrier: string
    serviceLevel: string
    rateAmountCents: number
    estimatedDays?: number
    shippoShipmentId: string
    weightOz: number
    lengthIn: number
    widthIn: number
    heightIn: number
  }

  // Verify seller owns this order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('seller_id', user.id)
    .eq('status', 'awaiting_shipment')
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found or already shipped' }, { status: 404 })

  const mustInsure = requiresInsurance(order.amount)

  try {
    const label = await purchaseLabel({
      rateObjectId,
      insuredValueCents: mustInsure ? order.amount : 0,
    })

    const estimatedDelivery = estimatedDays
      ? new Date(Date.now() + estimatedDays * 86400000).toISOString().slice(0, 10)
      : null

    // Create shipment record
    const { error: shipmentError } = await supabase.from('shipments').insert({
      order_id: orderId,
      shippo_shipment_id: shippoShipmentId,
      shippo_transaction_id: label.shippoTransactionId,
      carrier,
      service_level: serviceLevel,
      tracking_number: label.trackingNumber,
      tracking_url: label.trackingUrlProvider,
      tracking_status: 'pre_transit',
      label_url: label.labelUrl,
      label_purchased_at: new Date().toISOString(),
      insured: mustInsure,
      insured_value: mustInsure ? order.amount : null,
      weight_oz: weightOz,
      length_in: lengthIn,
      width_in: widthIn,
      height_in: heightIn,
      rate_amount: rateAmountCents,
      estimated_delivery_date: estimatedDelivery,
    })

    if (shipmentError) throw new Error(shipmentError.message)

    // ── Shipping markup + payout adjustment ──────────────────────────────────
    // If buyer paid shipping and there's a spread over the Shippo rate, apply
    // a 1.2x markup on the label cost. Seller nets the remaining spread.
    // If no spread (or free shipping), deduct the raw Shippo rate only.
    const MARKUP = 1.2
    const shippingCollected: number = (order as { shipping_price_cents?: number }).shipping_price_cents ?? 0
    const labelCost = rateAmountCents
    const hasSpread = shippingCollected > labelCost
    const labelDeduction = hasSpread
      ? Math.min(Math.round(labelCost * MARKUP), shippingCollected) // markup, capped at what was collected
      : labelCost

    // Recalculate seller payout: original payout already includes shipping collected,
    // so subtract the label deduction to get the final amount
    const currentPayout: number = (order as { seller_payout_cents?: number }).seller_payout_cents ?? 0
    const adjustedPayout = Math.max(0, currentPayout - labelDeduction)

    // Update order status + adjusted payout
    await supabase
      .from('orders')
      .update({
        status: 'label_purchased',
        seller_payout_cents: adjustedPayout,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    // Fire-and-forget shipping email to buyer
    void (async () => {
      try {
        const db = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: authData } = await db.auth.admin.getUserById(order.buyer_id)
        const buyerEmail = authData.user?.email
        const { data: listing } = await db.from('listings').select('coin_name').eq('id', order.listing_id).single()
        if (buyerEmail) {
          await sendShippingUpdate({
            to: buyerEmail,
            buyerName: buyerEmail.split('@')[0],
            listingTitle: listing?.coin_name ?? 'your order',
            trackingNumber: label.trackingNumber,
            trackingUrl: label.trackingUrlProvider,
            carrier,
          })
        }
      } catch { /* non-critical */ }
    })()

    return NextResponse.json({
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrlProvider,
      labelUrl: label.labelUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Label purchase failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
