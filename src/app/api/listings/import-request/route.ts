import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceDb } from '@/lib/admin'
import stripe from '@/lib/stripe'
import { sendImportRequestReceived } from '@/lib/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://my.pedigreecoins.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceDb()

  let dealerId = user.id
  const { data: profile } = await db
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (profile?.subscription_tier !== 'dealer') {
    const { data: teamMember } = await db
      .from('team_members')
      .select('dealer_id')
      .eq('user_id', user.id)
      .single()
    if (!teamMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    dealerId = teamMember.dealer_id
  }

  const { data, error } = await db
    .from('listing_import_requests')
    .select('id, file_name, row_count, notes, status, is_first_import, amount_cents, created_at, completed_at')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getServiceDb()

  let dealerId = user.id
  const { data: profile } = await db
    .from('profiles')
    .select('subscription_tier, display_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.subscription_tier !== 'dealer') {
    const { data: teamMember } = await db
      .from('team_members')
      .select('dealer_id')
      .eq('user_id', user.id)
      .single()
    if (!teamMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    dealerId = teamMember.dealer_id
  }

  const body = await req.json() as {
    file_name: string
    file_content: string
    row_count: number
    notes?: string
  }
  const { file_name, file_content, row_count, notes } = body

  const { data: priorCompleted } = await db
    .from('listing_import_requests')
    .select('id')
    .eq('dealer_id', dealerId)
    .eq('status', 'completed')
    .limit(1)

  const isFirstImport = !priorCompleted || priorCompleted.length === 0

  const dealerName = profile?.display_name ?? profile?.email ?? 'Dealer'

  if (isFirstImport) {
    await db.from('listing_import_requests').insert({
      dealer_id: dealerId,
      file_name,
      file_content,
      row_count,
      notes: notes ?? null,
      status: 'pending',
      is_first_import: true,
      amount_cents: 0,
    })

    await sendImportRequestReceived({
      to: 'paolo@zypremit.com',
      dealerName,
      rowCount: row_count,
      isFree: true,
      amountCents: 0,
      notes,
    }).catch(() => null)

    return NextResponse.json({ ok: true, isFree: true })
  }

  const amount_cents = row_count * 50

  const { data: inserted } = await db
    .from('listing_import_requests')
    .insert({
      dealer_id: dealerId,
      file_name,
      file_content,
      row_count,
      notes: notes ?? null,
      status: 'pending_payment',
      is_first_import: false,
      amount_cents,
    })
    .select('id')
    .single()

  const id = inserted?.id as string

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Listing Import - ${row_count} coins` },
        unit_amount: 50,
      },
      quantity: row_count,
    }],
    success_url: `${APP_URL}/dashboard/import?paid=true`,
    cancel_url: `${APP_URL}/dashboard/import`,
    metadata: { type: 'listing_import', import_request_id: id },
  })

  await db
    .from('listing_import_requests')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', id)

  return NextResponse.json({ ok: true, isFree: false, checkoutUrl: session.url })
}
