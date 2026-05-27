import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendOfferResponded } from '@/lib/resend'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, counterAmountCents } = await req.json() as {
    action: 'accept' | 'decline' | 'counter' | 'cancel'
    counterAmountCents?: number
  }

  const { data: offer } = await supabase
    .from('offers')
    .select('*, listings(coin_name, price)')
    .eq('id', id)
    .single()

  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.status !== 'pending' && offer.status !== 'countered') {
    return NextResponse.json({ error: 'Offer is no longer active' }, { status: 400 })
  }

  // Permission check
  const isSeller = offer.seller_id === user.id
  const isBuyer = offer.buyer_id === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Only seller can accept/decline/counter; only buyer can cancel
  if ((action === 'accept' || action === 'decline' || action === 'counter') && !isSeller) {
    return NextResponse.json({ error: 'Only the seller can respond to offers' }, { status: 403 })
  }
  if (action === 'cancel' && !isBuyer) {
    return NextResponse.json({ error: 'Only the buyer can cancel their offer' }, { status: 403 })
  }
  if (action === 'counter' && (!counterAmountCents || counterAmountCents <= 0)) {
    return NextResponse.json({ error: 'Counter amount required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    status: action === 'accept' ? 'accepted'
      : action === 'decline' ? 'declined'
      : action === 'counter' ? 'countered'
      : 'cancelled',
    updated_at: new Date().toISOString(),
  }
  if (action === 'counter') updateData.counter_amount_cents = counterAmountCents

  const { error } = await supabase.from('offers').update(updateData).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget email to the other party
  void (async () => {
    try {
      const db = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const notifyUserId = isSeller ? offer.buyer_id : offer.seller_id
      const { data: authData } = await db.auth.admin.getUserById(notifyUserId)
      const email = authData.user?.email
      const listingTitle = (offer.listings as { coin_name: string | null } | null)?.coin_name ?? 'your offer'
      if (email) {
        await sendOfferResponded({
          to: email,
          name: email.split('@')[0],
          listingTitle,
          action,
          originalAmountCents: offer.amount_cents,
          counterAmountCents: action === 'counter' ? counterAmountCents : undefined,
        })
      }
    } catch { /* non-critical */ }
  })()

  return NextResponse.json({ success: true })
}
