import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import stripe from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = getServiceDb()

  // ── checkout.session.completed ────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status !== 'paid') return NextResponse.json({ received: true })

    const meta = session.metadata ?? {}
    const {
      listing_id, buyer_id, seller_id, amount,
      ship_to_name, ship_to_street1, ship_to_street2,
      ship_to_city, ship_to_state, ship_to_zip,
      seller_payout_cents, platform_fee_cents,
    } = meta

    if (!listing_id || !buyer_id) return NextResponse.json({ received: true })

    // Idempotency: only create once
    const { data: existing } = await db
      .from('orders')
      .select('id')
      .eq('listing_id', listing_id)
      .maybeSingle()

    if (!existing) {
      const { data: listing } = await db
        .from('listings')
        .select('status, collection_item_id, coin_name, year, mint_mark, denomination, cert_number, grading_service, grade, grading_service_image_url, series_slug, price_row_label')
        .eq('id', listing_id)
        .single()

      if (listing && listing.status === 'active') {
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null)

        await db.from('orders').insert({
          listing_id,
          buyer_id,
          seller_id,
          amount: Number(amount ?? 0),
          seller_payout_cents: seller_payout_cents ? Number(seller_payout_cents) : null,
          platform_fee_cents: platform_fee_cents ? Number(platform_fee_cents) : null,
          ship_to_name,
          ship_to_street1,
          ship_to_street2: ship_to_street2 || null,
          ship_to_city,
          ship_to_state,
          ship_to_zip,
          ship_to_country: 'US',
          status: 'awaiting_shipment',
          stripe_payment_intent_id: paymentIntentId,
        })

        await db.from('listings').update({ status: 'sold' }).eq('id', listing_id)

        if (listing.collection_item_id) {
          await db.from('collection_items').update({ status: 'sold' }).eq('id', listing.collection_item_id)
        }

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
  }

  // ── charge.dispute.created ────────────────────────────────────────────────
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object as Stripe.Dispute
    const paymentIntentId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id

    if (paymentIntentId) {
      await db
        .from('orders')
        .update({ status: 'disputed', updated_at: new Date().toISOString() })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .neq('transfer_released', true)
    }
  }

  // ── charge.dispute.closed ─────────────────────────────────────────────────
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    const paymentIntentId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id

    if (paymentIntentId) {
      if (dispute.status === 'won') {
        // Dispute won — restore to delivered so cron will release funds
        await db
          .from('orders')
          .update({ status: 'delivered', updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .eq('status', 'disputed')
      } else {
        // Dispute lost — mark complete with no transfer (buyer refunded by Stripe)
        await db
          .from('orders')
          .update({ status: 'complete', transfer_released: true, updated_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .eq('status', 'disputed')
      }
    }
  }

  return NextResponse.json({ received: true })
}
