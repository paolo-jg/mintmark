import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import stripe from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function BuySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) redirect('/listings')

  // ── Verify payment with Stripe ─────────────────────────────────────────────
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    redirect('/listings')
  }

  if (session.payment_status !== 'paid') {
    redirect('/listings')
  }

  const meta = session.metadata ?? {}
  const { listing_id, buyer_id, ship_to_name, ship_to_street1, ship_to_street2,
    ship_to_city, ship_to_state, ship_to_zip, seller_id, amount } = meta

  if (!listing_id || !buyer_id) redirect('/listings')

  const db = getServiceDb()

  // ── Idempotency: only create order once ───────────────────────────────────
  const { data: existingOrder } = await db
    .from('orders')
    .select('id')
    .eq('listing_id', listing_id)
    .maybeSingle()

  if (!existingOrder) {
    const { data: listing } = await db
      .from('listings')
      .select('status, collection_item_id, coin_name, year, mint_mark, denomination, cert_number, grading_service, grade, grading_service_image_url, series_slug, price_row_label')
      .eq('id', listing_id)
      .single()

    if (listing && listing.status === 'active') {
      // Create order
      await db.from('orders').insert({
        listing_id,
        buyer_id,
        seller_id,
        amount: Number(amount ?? 0),
        ship_to_name,
        ship_to_street1,
        ship_to_street2: ship_to_street2 || null,
        ship_to_city,
        ship_to_state,
        ship_to_zip,
        ship_to_country: 'US',
        status: 'awaiting_shipment',
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      })

      // Mark listing sold
      await db.from('listings').update({ status: 'sold' }).eq('id', listing_id)

      // Return collection item to owned if it was listed from collection
      if (listing.collection_item_id) {
        await db.from('collection_items').update({ status: 'sold' }).eq('id', listing.collection_item_id)
      }

      // Add coin to buyer's collection
      await db.from('collection_items').insert({
        user_id: buyer_id,
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
    }
  }

  // ── Success UI ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Payment confirmed!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your purchase is complete. The seller will ship your coin soon.
            You&apos;ll find it in your collection once it arrives.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href="/collect"
            className="w-full inline-flex items-center justify-center rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity"
          >
            View My Collection
          </Link>
          <Link
            href="/listings"
            className="w-full inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors"
          >
            Keep Browsing
          </Link>
        </div>
      </div>
    </div>
  )
}
