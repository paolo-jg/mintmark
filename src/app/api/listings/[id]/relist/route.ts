import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const LISTING_LIMITS: Record<string, number | null> = {
  collector_basic: 10,
  collector_premium: 50,
  dealer: null,
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await params
  const body = await req.json().catch(() => ({}))
  const mode: 'draft' | 'active' = body.mode === 'active' ? 'active' : 'draft'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .eq('seller_id', user.id)
    .in('status', ['expired', 'sold'])
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found or cannot be relisted' }, { status: 404 })

  // Check monthly quota
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = profile?.subscription_tier ?? 'collector_basic'
  const limit = LISTING_LIMITS[tier] ?? null

  if (limit !== null) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const [{ count: carryOver }, { count: createdThisMonth }] = await Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id).eq('status', 'active').lt('created_at', monthStart),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('seller_id', user.id).gte('created_at', monthStart).in('status', ['active', 'sold', 'expired']),
    ])
    const used = (carryOver ?? 0) + (createdThisMonth ?? 0)
    if (used >= limit) {
      return NextResponse.json({ error: 'Monthly listing limit reached. Upgrade your plan to list more.' }, { status: 403 })
    }
  }

  // For active auction relists, fetch original auction to preserve start/reserve prices & duration
  let originalAuction: { start_time: string; end_time: string; start_price: number; reserve_price: number | null } | null = null
  if (mode === 'active' && listing.listing_type === 'auction') {
    const { data: auc } = await supabase
      .from('auctions')
      .select('start_time, end_time, start_price, reserve_price')
      .eq('listing_id', listingId)
      .single()
    originalAuction = auc ?? null
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const listingPayload = {
    seller_id: user.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    images: listing.images,
    listing_type: listing.listing_type,
    status: mode,
    grading_service: listing.grading_service,
    cert_number: listing.cert_number,
    grade: listing.grade,
    verification_status: listing.verification_status,
    cac_designation: listing.cac_designation,
    coin_name: listing.coin_name,
    year: listing.year,
    mint_mark: listing.mint_mark,
    denomination: listing.denomination,
    population_at_grade: listing.population_at_grade,
    population_above: listing.population_above,
    grading_service_image_url: listing.grading_service_image_url,
    series_slug: listing.series_slug,
    price_row_label: listing.price_row_label,
    shipping_type: listing.shipping_type,
    shipping_price_cents: listing.shipping_price_cents,
    accept_offers: listing.accept_offers,
    min_offer_amount: listing.min_offer_amount,
    pass_convenience_fee: listing.pass_convenience_fee,
    returns_accepted: false,
    listing_duration_days: listing.listing_duration_days,
  }

  const { data: newListing, error } = await db
    .from('listings')
    .insert(listingPayload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For active auction relists, create a fresh auction record
  if (mode === 'active' && listing.listing_type === 'auction' && originalAuction) {
    const origStart = new Date(originalAuction.start_time)
    const origEnd = new Date(originalAuction.end_time)
    const durationDays = Math.max(1, Math.round((origEnd.getTime() - origStart.getTime()) / (1000 * 60 * 60 * 24)))
    const endTime = new Date()
    endTime.setDate(endTime.getDate() + durationDays)
    await db.from('auctions').insert({
      listing_id: newListing.id,
      start_price: originalAuction.start_price,
      current_bid: originalAuction.start_price,
      reserve_price: originalAuction.reserve_price,
      start_time: new Date().toISOString(),
      end_time: endTime.toISOString(),
    })
  }

  return NextResponse.json({ id: newListing.id, mode })
}
