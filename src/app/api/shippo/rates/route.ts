import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRates, requiresInsurance, type ShippoAddress, type ParcelDimensions } from '@/lib/shippo'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { orderId, parcel } = body as {
    orderId: string
    parcel: ParcelDimensions
  }

  // Fetch order + seller address + buyer address
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, listings(seller_id), profiles!orders_seller_id_fkey(*)')
    .eq('id', orderId)
    .eq('seller_id', user.id) // Only seller can fetch rates
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Seller's default address
  const { data: sellerAddress } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single()

  if (!sellerAddress) {
    return NextResponse.json({ error: 'Add a default shipping address in your profile first' }, { status: 400 })
  }

  const fromAddress: ShippoAddress = {
    name: sellerAddress.name,
    street1: sellerAddress.street1,
    street2: sellerAddress.street2,
    city: sellerAddress.city,
    state: sellerAddress.state,
    zip: sellerAddress.zip,
    country: sellerAddress.country,
  }

  const toAddress: ShippoAddress = {
    name: order.ship_to_name,
    street1: order.ship_to_street1,
    street2: order.ship_to_street2,
    city: order.ship_to_city,
    state: order.ship_to_state,
    zip: order.ship_to_zip,
    country: order.ship_to_country,
  }

  const mustInsure = requiresInsurance(order.amount)
  const insuredValue = mustInsure ? order.amount : 0

  try {
    const { shippoShipmentId, rates } = await getRates({
      fromAddress,
      toAddress,
      parcel,
      insuredValueCents: insuredValue,
    })

    return NextResponse.json({
      shippoShipmentId,
      rates,
      mustInsure,
      insuredValueCents: insuredValue,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get rates'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
