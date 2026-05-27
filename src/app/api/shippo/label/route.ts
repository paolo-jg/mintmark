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

    // Update order status
    await supabase
      .from('orders')
      .update({
        status: 'label_purchased',
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
