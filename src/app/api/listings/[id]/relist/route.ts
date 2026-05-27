import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const LISTING_LIMITS: Record<string, number | null> = {
  collector_basic: 10,
  collector_premium: 50,
  dealer: null,
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await params
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
        .eq('seller_id', user.id).gte('created_at', monthStart),
    ])
    const used = (carryOver ?? 0) + (createdThisMonth ?? 0)
    if (used >= limit) {
      return NextResponse.json({ error: 'Monthly listing limit reached. Upgrade your plan to list more.' }, { status: 403 })
    }
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create a fresh draft from the original listing
  const { data: newListing, error } = await db.from('listings').insert({
    seller_id: user.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    images: listing.images,
    listing_type: listing.listing_type,
    status: 'draft',
    grading_service: listing.grading_service,
    cert_number: listing.cert_number,
    grade: listing.grade,
    cac_designation: listing.cac_designation,
    coin_name: listing.coin_name,
    year: listing.year,
    mint_mark: listing.mint_mark,
    denomination: listing.denomination,
    composition: listing.composition,
    series_slug: listing.series_slug,
    shipping_type: listing.shipping_type,
    shipping_price_cents: listing.shipping_price_cents,
    accept_offers: listing.accept_offers,
    min_offer_cents: listing.min_offer_cents,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: newListing.id })
}
