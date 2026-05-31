import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import stripe from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendOrderConfirmationBuyer, sendNewOrderSeller, sendDisputeOpened, sendDisputeResolved, sendFirstPurchaseCongrats, sendPurchaseReminder, sendImportRequestReceived } from '@/lib/resend'

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
      seller_payout_cents, platform_fee_cents, shipping_price_cents,
    } = meta

    // listing_import payment
    if (session.metadata?.type === 'listing_import') {
      const importId = session.metadata.import_request_id
      if (importId) {
        const { data: importReq } = await db
          .from('listing_import_requests')
          .update({ status: 'pending', paid_at: new Date().toISOString() })
          .eq('id', importId)
          .select('dealer_id, row_count, notes, file_name')
          .single()

        if (importReq) {
          const { data: dealerProfile } = await db
            .from('profiles')
            .select('email, display_name')
            .eq('id', importReq.dealer_id)
            .single()

          const dealerName = dealerProfile?.display_name ?? dealerProfile?.email ?? 'Dealer'
          const amountCents = session.amount_total ?? (importReq.row_count * 50)

          await sendImportRequestReceived({
            to: 'paolo@zypremit.com',
            dealerName,
            rowCount: importReq.row_count,
            isFree: false,
            amountCents,
            notes: importReq.notes ?? undefined,
          })
        }
      }
      return NextResponse.json({ ok: true })
    }

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

        const { data: newOrder } = await db.from('orders').insert({
          listing_id,
          buyer_id,
          seller_id,
          amount: Number(amount ?? 0),
          seller_payout_cents: seller_payout_cents ? Number(seller_payout_cents) : null,
          platform_fee_cents: platform_fee_cents ? Number(platform_fee_cents) : null,
          shipping_price_cents: shipping_price_cents ? Number(shipping_price_cents) : 0,
          ship_to_name,
          ship_to_street1,
          ship_to_street2: ship_to_street2 || null,
          ship_to_city,
          ship_to_state,
          ship_to_zip,
          ship_to_country: 'US',
          status: 'awaiting_shipment',
          stripe_payment_intent_id: paymentIntentId,
        }).select('id').single()

        await db.from('listings').update({ status: 'sold' }).eq('id', listing_id)

        // Record sale in price history for the coin tracker
        if (listing.coin_name && listing.grade && listing.grading_service) {
          void db.from('price_history').insert({
            coin_name: listing.coin_name,
            year: listing.year ?? null,
            mint_mark: listing.mint_mark ?? null,
            denomination: listing.denomination ?? null,
            grading_service: listing.grading_service,
            grade: listing.grade,
            series_slug: listing.series_slug ?? null,
            sale_price: Number(amount ?? 0),
            sale_date: new Date().toISOString(),
            listing_id,
          })
        }

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

        // Fire-and-forget confirmation + steps emails
        const orderId = newOrder?.id ?? listing_id
        const [buyerAuth, sellerAuth, { count: buyerOrderCount }] = await Promise.all([
          db.auth.admin.getUserById(buyer_id),
          db.auth.admin.getUserById(seller_id),
          db.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', buyer_id),
        ])
        const buyerEmail = buyerAuth.data.user?.email
        const sellerEmail = sellerAuth.data.user?.email
        const listingTitle = listing.coin_name ?? 'your listing'
        const payoutCents = seller_payout_cents ? Number(seller_payout_cents) : 0

        if (buyerEmail) {
          sendOrderConfirmationBuyer({
            to: buyerEmail,
            buyerName: buyerEmail.split('@')[0],
            orderId,
            listingTitle,
            amountCents: Number(amount ?? 0),
          }).catch(() => null)
          const buyerName = buyerEmail.split('@')[0]
          if ((buyerOrderCount ?? 0) <= 1) {
            sendFirstPurchaseCongrats({ to: buyerEmail, buyerName, listingTitle, orderId }).catch(() => null)
          } else {
            sendPurchaseReminder({ to: buyerEmail, buyerName, listingTitle, orderId }).catch(() => null)
          }
        }
        if (sellerEmail) {
          sendNewOrderSeller({
            to: sellerEmail,
            sellerName: sellerEmail.split('@')[0],
            orderId,
            listingTitle,
            payoutCents,
          }).catch(() => null)
        }
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
      const { data: order } = await db
        .from('orders')
        .update({ status: 'disputed', updated_at: new Date().toISOString() })
        .eq('stripe_payment_intent_id', paymentIntentId)
        .neq('transfer_released', true)
        .select('buyer_id, seller_id, listing_id')
        .single()

      if (order) {
        void (async () => {
          try {
            const [{ data: buyerAuth }, { data: sellerAuth }, { data: listing }] = await Promise.all([
              db.auth.admin.getUserById(order.buyer_id),
              db.auth.admin.getUserById(order.seller_id),
              db.from('listings').select('coin_name').eq('id', order.listing_id).single(),
            ])
            const title = listing?.coin_name ?? 'your order'
            if (buyerAuth.user?.email) {
              await sendDisputeOpened({ to: buyerAuth.user.email, name: buyerAuth.user.email.split('@')[0], listingTitle: title, role: 'buyer' })
            }
            if (sellerAuth.user?.email) {
              await sendDisputeOpened({ to: sellerAuth.user.email, name: sellerAuth.user.email.split('@')[0], listingTitle: title, role: 'seller' })
            }
          } catch { /* non-critical */ }
        })()
      }
    }
  }

  // ── charge.dispute.closed ─────────────────────────────────────────────────
  if (event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute
    const paymentIntentId = typeof dispute.payment_intent === 'string'
      ? dispute.payment_intent
      : dispute.payment_intent?.id

    if (paymentIntentId) {
      const won = dispute.status === 'won'
      const { data: order } = won
        ? await db.from('orders').update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('stripe_payment_intent_id', paymentIntentId).eq('status', 'disputed').select('buyer_id, seller_id, listing_id').single()
        : await db.from('orders').update({ status: 'complete', transfer_released: true, updated_at: new Date().toISOString() }).eq('stripe_payment_intent_id', paymentIntentId).eq('status', 'disputed').select('buyer_id, seller_id, listing_id').single()

      if (order) {
        void (async () => {
          try {
            const [{ data: buyerAuth }, { data: sellerAuth }, { data: listing }] = await Promise.all([
              db.auth.admin.getUserById(order.buyer_id),
              db.auth.admin.getUserById(order.seller_id),
              db.from('listings').select('coin_name').eq('id', order.listing_id).single(),
            ])
            const title = listing?.coin_name ?? 'your order'
            const outcome = won ? 'won' : 'lost'
            if (buyerAuth.user?.email) {
              await sendDisputeResolved({ to: buyerAuth.user.email, name: buyerAuth.user.email.split('@')[0], listingTitle: title, role: 'buyer', outcome })
            }
            if (sellerAuth.user?.email) {
              await sendDisputeResolved({ to: sellerAuth.user.email, name: sellerAuth.user.email.split('@')[0], listingTitle: title, role: 'seller', outcome })
            }
          } catch { /* non-critical */ }
        })()
      }
    }
  }

  // ── customer.subscription.created / updated ───────────────────────────────
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    const targetTier = sub.metadata?.target_tier

    if (userId && targetTier && sub.status === 'active') {
      await db.from('profiles').update({
        subscription_tier: targetTier,
        onboarding_completed: true,
        requires_plan_selection: false,
      }).eq('id', userId)
    }
  }

  // ── customer.subscription.deleted ────────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (userId) {
      await db.from('profiles').update({ subscription_tier: 'collector_basic' }).eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
