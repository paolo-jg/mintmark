import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// ── Validation helpers ────────────────────────────────────────────────────────

const GRADING_SERVICES = ['PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS', 'Ungraded'] as const
const LISTING_TYPES = ['fixed', 'auction'] as const
const CURRENT_YEAR = new Date().getFullYear()

function parseCents(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val.replace(/[$,]/g, '').trim())
  return isNaN(n) || n <= 0 ? null : Math.round(n * 100)
}

function parseIntCol(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = parseInt(val.trim(), 10)
  return isNaN(n) ? null : n
}

function parseBool(val: string | undefined): boolean {
  return val?.toLowerCase().trim() === 'true' || val?.trim() === '1'
}

export interface RowError {
  row: number
  field: string
  message: string
}

export interface ParsedRow {
  // Coin
  title: string
  description: string | null
  listing_type: 'fixed' | 'auction'
  coin_name: string | null
  year: number | null
  mint_mark: string | null
  denomination: string | null
  grading_service: string | null
  grade: string | null
  cert_number: string | null
  cac_designation: boolean
  // Pricing
  price: number | null
  start_price: number | null
  reserve_price: number | null
  auction_bin_price: number | null
  listing_duration_days: number | null
  pass_convenience_fee: boolean
  // Offers
  accept_offers: boolean
  min_offer_amount: number | null
  // Returns
  returns_accepted: boolean
  returns_policy_type: 'standard' | 'custom' | null
  returns_policy_days: number | null
  returns_policy_custom: string | null
}

function validateRow(raw: Record<string, string>, idx: number): { row: ParsedRow | null; errors: RowError[] } {
  const errors: RowError[] = []
  const r = (key: string) => raw[key]?.trim() ?? ''

  // Required: title
  const title = r('title')
  if (!title) errors.push({ row: idx, field: 'title', message: 'Title is required' })
  if (title.length > 200) errors.push({ row: idx, field: 'title', message: 'Title must be 200 characters or fewer' })

  // Required: listing_type
  const listing_type = r('listing_type').toLowerCase() as 'fixed' | 'auction'
  if (!LISTING_TYPES.includes(listing_type)) {
    errors.push({ row: idx, field: 'listing_type', message: 'Must be "fixed" or "auction"' })
  }

  // Price validation
  const price = listing_type === 'fixed' ? parseCents(r('price')) : null
  const start_price = listing_type === 'auction' ? parseCents(r('start_price')) : null
  if (listing_type === 'fixed' && !price) {
    errors.push({ row: idx, field: 'price', message: 'Price is required for fixed listings' })
  }
  if (listing_type === 'auction' && !start_price) {
    errors.push({ row: idx, field: 'start_price', message: 'Start price is required for auctions' })
  }

  // Optional: grading_service
  const gsRaw = r('grading_service')
  const grading_service = gsRaw
    ? GRADING_SERVICES.find(s => s.toLowerCase() === gsRaw.toLowerCase()) ?? null
    : null
  if (gsRaw && !grading_service) {
    errors.push({ row: idx, field: 'grading_service', message: `Must be one of: ${GRADING_SERVICES.join(', ')}` })
  }

  // Optional: year
  const yearRaw = r('year')
  const year = yearRaw ? parseIntCol(yearRaw) : null
  if (yearRaw && (year === null || year < 1700 || year > CURRENT_YEAR)) {
    errors.push({ row: idx, field: 'year', message: `Year must be between 1700 and ${CURRENT_YEAR}` })
  }

  // Returns policy
  const returns_policy_type_raw = r('returns_policy_type').toLowerCase()
  const returns_policy_type = returns_policy_type_raw === 'standard' ? 'standard'
    : returns_policy_type_raw === 'custom' ? 'custom'
    : null

  const listing_duration_raw = r('listing_duration_days').toLowerCase()
  const listing_duration_days = listing_duration_raw === 'gtc' ? null
    : listing_duration_raw ? parseIntCol(listing_duration_raw)
    : null

  if (errors.length > 0) return { row: null, errors }

  return {
    errors: [],
    row: {
      title,
      description: r('description') || null,
      listing_type,
      coin_name: r('coin_name') || null,
      year,
      mint_mark: r('mint_mark') || null,
      denomination: r('denomination') || null,
      grading_service: grading_service !== 'Ungraded' ? grading_service : null,
      grade: r('grade') || null,
      cert_number: r('cert_number') || null,
      cac_designation: parseBool(r('cac_designation')),
      price,
      start_price,
      reserve_price: parseCents(r('reserve_price')),
      auction_bin_price: parseCents(r('auction_bin_price')),
      listing_duration_days,
      pass_convenience_fee: parseBool(r('pass_convenience_fee')),
      accept_offers: parseBool(r('accept_offers')),
      min_offer_amount: parseCents(r('min_offer_amount')),
      returns_accepted: parseBool(r('returns_accepted')),
      returns_policy_type,
      returns_policy_days: parseIntCol(r('returns_policy_days')),
      returns_policy_custom: r('returns_policy_custom') || null,
    },
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve effective seller: team member acts on behalf of dealer
  const { data: membership } = await supabase
    .from('team_members')
    .select('dealer_id')
    .eq('user_id', session.user.id)
    .single()

  const sellerId = membership?.dealer_id ?? session.user.id

  // Must be dealer (or team member of dealer)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', sellerId)
    .single()

  if (profile?.subscription_tier !== 'dealer') {
    return NextResponse.json({ error: 'Bulk import is only available on Dealer accounts' }, { status: 403 })
  }

  const body = await req.json()
  const rows: Record<string, string>[] = body.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 rows per import' }, { status: 400 })
  }

  // Validate all rows — collect errors but don't abort early
  const validRows: ParsedRow[] = []
  const allErrors: RowError[] = []

  rows.forEach((raw, i) => {
    const { row, errors } = validateRow(raw, i + 1)
    if (errors.length) allErrors.push(...errors)
    else if (row) validRows.push(row)
  })

  if (allErrors.length > 0) {
    return NextResponse.json({ errors: allErrors, imported: 0 }, { status: 422 })
  }

  // Build insert payload
  const inserts = validRows.map(r => ({
    seller_id:            sellerId,
    status:               'draft' as const,
    images:               [] as string[],
    verification_status:  'unverified' as const,
    title:                r.title,
    description:          r.description,
    listing_type:         r.listing_type,
    coin_name:            r.coin_name,
    year:                 r.year,
    mint_mark:            r.mint_mark,
    denomination:         r.denomination,
    grading_service:      r.grading_service,
    grade:                r.grade,
    cert_number:          r.cert_number,
    cac_designation:      r.cac_designation,
    price:                r.listing_type === 'fixed' ? r.price : null,
    listing_duration_days: r.listing_duration_days,
    pass_convenience_fee: r.pass_convenience_fee,
    accept_offers:        r.accept_offers,
    min_offer_amount:     r.min_offer_amount,
    returns_accepted:     r.returns_accepted,
    returns_policy_type:  r.returns_policy_type,
    returns_policy_days:  r.returns_policy_days,
    returns_policy_custom: r.returns_policy_custom,
    auction_bin_price:    r.auction_bin_price,
  }))

  // Use service role to bypass RLS insert restriction (team member creating for dealer)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Insert auction rows separately to also create the auctions record
  const fixedRows = inserts.filter(r => r.listing_type === 'fixed')
  const auctionRows = inserts.filter(r => r.listing_type === 'auction')

  let imported = 0

  if (fixedRows.length) {
    const { error, count } = await serviceClient.from('listings').insert(fixedRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    imported += count ?? fixedRows.length
  }

  if (auctionRows.length) {
    // Insert listings first, then create auctions rows
    const { data: auctionListings, error } = await serviceClient
      .from('listings')
      .insert(auctionRows.map(r => ({ ...r })))
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const auctionInserts = (auctionListings ?? []).map((l, i) => {
      const src = validRows.filter(r => r.listing_type === 'auction')[i]
      const durationDays = src?.listing_duration_days ?? 7
      return {
        listing_id:   l.id,
        start_price:  src?.start_price ?? 0,
        current_bid:  src?.start_price ?? 0,
        reserve_price: src?.reserve_price ?? null,
        end_time:     new Date(Date.now() + durationDays * 86400000).toISOString(),
        bid_count:    0,
      }
    })

    if (auctionInserts.length) {
      const { error: aErr } = await serviceClient.from('auctions').insert(auctionInserts)
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })
    }

    imported += auctionListings?.length ?? auctionRows.length
  }

  return NextResponse.json({ imported, errors: [] })
}
