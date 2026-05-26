import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import stripe from '@/lib/stripe'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function calcConvenienceFee(priceUsd: number): number {
  // Pass-through: covers Stripe's 2.9% + $0.30 processing fee so seller isn't out of pocket
  return (priceUsd * 0.029 + 0.30) / (1 - 0.029) + 0.30
}

type SubscriptionTier =
  | 'collector_basic'
  | 'collector_standard'
  | 'collector_premium'
  | 'dealer_basic'
  | 'dealer_standard'
  | 'dealer_premium'

// Buyer fee: tied to the BUYER's subscription plan
const BUYER_FEE_RATE: Record<SubscriptionTier, number> = {
  collector_basic:    0.07,
  collector_standard: 0.05,
  collector_premium:  0.01,
  dealer_basic:       0.01,
  dealer_standard:    0.01,
  dealer_premium:     0.00,
}

// Seller fee: tied to the SELLER's subscription plan
const SELLER_FEE_RATE: Record<SubscriptionTier, number> = {
  collector_basic:    0.07,
  collector_standard: 0.05,
  collector_premium:  0.05,
  dealer_basic:       0.025,
  dealer_standard:    0.01,
  dealer_premium:     0.00,
}

function fmtPct(rate: number): string {
  const pct = rate * 100
  return pct % 1 === 0 ? `${pct}%` : `${pct}%`
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Parse body ────────────────────────────────────────────────────────────
  const body = await req.json() as {
    listing_id: string
    ship_to_name: string
    ship_to_street1: string
    ship_to_street2?: string
    ship_to_city: string
    ship_to_state: string
    ship_to_zip: string
  }

  const { listing_id, ship_to_name, ship_to_street1, ship_to_street2, ship_to_city, ship_to_state, ship_to_zip } = body

  if (!listing_id || !ship_to_name || !ship_to_street1 || !ship_to_city || !ship_to_state || !ship_to_zip) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getServiceDb()

  // ── Fetch listing ─────────────────────────────────────────────────────────
  const { data: listing } = await db
    .from('listings')
    .select('id, title, coin_name, price, seller_id, status, pass_convenience_fee, grading_service, grade, cert_number')
    .eq('id', listing_id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.status !== 'active') return NextResponse.json({ error: 'Listing is no longer available' }, { status: 400 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'You cannot buy your own listing' }, { status: 400 })
  if (!listing.price) return NextResponse.json({ error: 'Listing has no price' }, { status: 400 })

  // ── Fetch seller profile + buyer profile (parallel) ──────────────────────
  const [{ data: sellerProfile }, { data: buyerProfile }] = await Promise.all([
    db
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, subscription_tier')
      .eq('id', listing.seller_id)
      .single(),
    db
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single(),
  ])

  const sellerAccountId =
    sellerProfile?.stripe_onboarding_complete && sellerProfile?.stripe_account_id
      ? (sellerProfile.stripe_account_id as string)
      : null

  // ── Fee calculation ───────────────────────────────────────────────────────
  const priceUsd = listing.price / 100

  const buyerTier = (buyerProfile?.subscription_tier ?? 'collector_basic') as SubscriptionTier
  const sellerTier = (sellerProfile?.subscription_tier ?? 'collector_basic') as SubscriptionTier
  const buyerFeeRate = BUYER_FEE_RATE[buyerTier] ?? 0.07
  const sellerFeeRate = SELLER_FEE_RATE[sellerTier] ?? 0.07

  const buyerFeeCents = Math.round(listing.price * buyerFeeRate)
  const sellerFeeCents = Math.round(listing.price * sellerFeeRate)
  const platformFeeCents = buyerFeeCents + sellerFeeCents   // total platform take

  const convFeeCents = listing.pass_convenience_fee
    ? Math.round(calcConvenienceFee(priceUsd) * 100)
    : 0

  // ── Build line items ──────────────────────────────────────────────────────
  type LineItem = { price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }
  const lineItems: LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: listing.coin_name ?? listing.title,
          ...(listing.grading_service && listing.grade
            ? { description: `${listing.grading_service} ${listing.grade}${listing.cert_number ? ` · Cert #${listing.cert_number}` : ''}` }
            : {}),
        },
        unit_amount: listing.price,
      },
      quantity: 1,
    },
    {
      price_data: {
        currency: 'usd',
        product_data: { name: `Buyer fee (${fmtPct(buyerFeeRate)})` },
        unit_amount: buyerFeeCents,
      },
      quantity: 1,
    },
  ]

  if (convFeeCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Card processing fee' },
        unit_amount: convFeeCents,
      },
      quantity: 1,
    })
  }

  // ── Create Checkout Session ───────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    payment_intent_data: {
      ...(sellerAccountId
        ? {
            application_fee_amount: platformFeeCents,
            transfer_data: { destination: sellerAccountId },
          }
        : {}),
      metadata: {
        listing_id,
        buyer_id: user.id,
      },
    },
    // Store everything needed to create the order on success
    metadata: {
      listing_id,
      buyer_id: user.id,
      ship_to_name,
      ship_to_street1,
      ship_to_street2: ship_to_street2 ?? '',
      ship_to_city,
      ship_to_state,
      ship_to_zip,
      seller_id: listing.seller_id,
      amount: String(listing.price),
      buyer_fee_cents: String(buyerFeeCents),
      seller_fee_cents: String(sellerFeeCents),
      buyer_tier: buyerTier,
      seller_tier: sellerTier,
    },
    success_url: `${baseUrl}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/listings/${listing_id}`,
  })

  return NextResponse.json({ url: session.url })
}
