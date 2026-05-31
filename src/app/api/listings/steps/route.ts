import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceDb } from '@/lib/admin'
import { sendFirstListingCongrats, sendListingReminder } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const { listing_id, listing_title } = await req.json() as { listing_id: string; listing_title: string }
  if (!listing_id) return NextResponse.json({ ok: false }, { status: 400 })

  const db = getServiceDb()

  const [{ data: authUser }, { count }] = await Promise.all([
    db.auth.admin.getUserById(user.id),
    db.from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active'),
  ])

  const email = authUser.user?.email
  if (!email) return NextResponse.json({ ok: true })

  const listingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing_id}`
  const sellerName = email.split('@')[0]
  // count includes the listing just created, so count === 1 means it's their first
  if ((count ?? 0) <= 1) {
    await sendFirstListingCongrats({ to: email, sellerName, listingTitle: listing_title, listingUrl }).catch(() => null)
  } else {
    await sendListingReminder({ to: email, sellerName, listingTitle: listing_title, listingUrl }).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}
