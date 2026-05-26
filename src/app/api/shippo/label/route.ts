import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { purchaseLabel, requiresInsurance } from '@/lib/shippo'


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
