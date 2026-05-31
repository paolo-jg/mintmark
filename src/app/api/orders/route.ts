import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendFirstPurchaseCongrats, sendPurchaseReminder } from '@/lib/resend'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Auth via anon client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    listing_id: string
    ship_to_name: string
    ship_to_street1: string
    ship_to_street2?: string
    ship_to_city: string
    ship_to_state: string
    ship_to_zip: string
    ship_to_country?: string
  }

  const {
    listing_id,
    ship_to_name,
    ship_to_street1,
    ship_to_street2,
    ship_to_city,
    ship_to_state,
    ship_to_zip,
    ship_to_country,
  } = body

  if (!listing_id || !ship_to_name || !ship_to_street1 || !ship_to_city || !ship_to_state || !ship_to_zip) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getServiceDb()

  // Fetch and validate listing
  const { data: listing, error: listingError } = await db
    .from('listings')
    .select('id, status, seller_id, price, coin_name, year, mint_mark, denomination, cert_number, grading_service, grade, grading_service_image_url, series_slug, price_row_label, collection_item_id, shipping_type, shipping_price_cents')
    .eq('id', listing_id)
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.status !== 'active') {
    return NextResponse.json({ error: 'Listing is no longer available' }, { status: 400 })
  }

  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 })
  }

  const CONCIERGE_THRESHOLD_CENTS = 50_000_000
  if ((listing.price ?? 0) >= CONCIERGE_THRESHOLD_CENTS) {
    return NextResponse.json({
      error: 'This listing requires Pedigree Concierge shipping. Please contact us to arrange insured delivery for high-value transactions.',
      concierge_required: true,
    }, { status: 400 })
  }

  // Create the order
  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      listing_id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount: listing.price,
      ship_to_name,
      ship_to_street1,
      ship_to_street2: ship_to_street2 ?? null,
      ship_to_city,
      ship_to_state,
      ship_to_zip,
      ship_to_country: ship_to_country ?? 'US',
      status: 'awaiting_shipment',
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'Failed to create order' }, { status: 500 })
  }

  // Mark listing as sold
  await db
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', listing_id)

  // If listing has a collection_item_id, mark that item sold
  if (listing.collection_item_id) {
    await db
      .from('collection_items')
      .update({ status: 'sold' })
      .eq('id', listing.collection_item_id)
  }

  // Create buyer's collection item
  await db.from('collection_items').insert({
    user_id: user.id,
    type: 'owned',
    status: 'owned',
    coin_name: listing.coin_name,
    year: listing.year,
    mint_mark: listing.mint_mark,
    denomination: listing.denomination,
    cert_number: listing.cert_number,
    grading_service: listing.grading_service,
    grade: listing.grade,
    pcgs_image_url: listing.grading_service_image_url,
    series_slug: listing.series_slug,
    price_row_label: listing.price_row_label,
  })

  // Wishlist migration: remove buyer's wishlist items that match this coin
  if (listing.series_slug && listing.price_row_label) {
    const { data: wishlistItems } = await db
      .from('collection_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'wishlist')
      .eq('series_slug', listing.series_slug)
      .eq('price_row_label', listing.price_row_label)

    if (wishlistItems && wishlistItems.length > 0) {
      const toDelete = wishlistItems.filter(item => {
        const serviceMatch = item.grading_service === listing.grading_service || !item.grading_service
        const gradeMatch = item.grade === listing.grade || !item.grade
        return serviceMatch && gradeMatch
      })

      if (toDelete.length > 0) {
        await db
          .from('collection_items')
          .delete()
          .in('id', toDelete.map((i: { id: string }) => i.id))
      }
    }
  }

  // Fire-and-forget steps email
  void (async () => {
    try {
      const db2 = getServiceDb()
      const [{ data: authUser }, { count }] = await Promise.all([
        db2.auth.admin.getUserById(user.id),
        db2.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', user.id),
      ])
      const email = authUser.user?.email
      if (email) {
        const buyerName = email.split('@')[0]
        const listingTitle = listing.coin_name ?? 'your order'
        if ((count ?? 0) <= 1) {
          await sendFirstPurchaseCongrats({ to: email, buyerName, listingTitle, orderId: order.id })
        } else {
          await sendPurchaseReminder({ to: email, buyerName, listingTitle, orderId: order.id })
        }
      }
    } catch { /* non-critical */ }
  })()

  return NextResponse.json({ data: { order_id: order.id } })
}
