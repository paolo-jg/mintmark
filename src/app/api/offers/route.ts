import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendOfferReceived } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId, amountCents, message } = await req.json() as {
    listingId: string
    amountCents: number
    message?: string
  }

  if (!listingId || !amountCents || amountCents <= 0) {
    return NextResponse.json({ error: 'Invalid offer' }, { status: 400 })
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, seller_id, status, accept_offers, price, coin_name')
    .eq('id', listingId)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.status !== 'active') return NextResponse.json({ error: 'Listing is no longer active' }, { status: 400 })
  if (!listing.accept_offers) return NextResponse.json({ error: 'Seller is not accepting offers' }, { status: 400 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'Cannot offer on your own listing' }, { status: 400 })

  // Cancel any existing pending offer from this buyer on this listing
  await supabase
    .from('offers')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .eq('status', 'pending')

  const { data: offer, error } = await supabase
    .from('offers')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount_cents: amountCents,
      message: message?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget email to seller
  void (async () => {
    try {
      const db = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: sellerAuth } = await db.auth.admin.getUserById(listing.seller_id)
      const sellerEmail = sellerAuth.user?.email
      const { data: buyerProfile } = await db.from('profiles').select('username').eq('id', user.id).single()
      if (sellerEmail) {
        await sendOfferReceived({
          to: sellerEmail,
          sellerName: sellerEmail.split('@')[0],
          listingTitle: listing.coin_name ?? 'your listing',
          amountCents,
          buyerName: buyerProfile?.username ?? 'A buyer',
          askingPriceCents: listing.price ?? 0,
        })
      }
    } catch { /* non-critical */ }
  })()

  return NextResponse.json({ offer })
}
