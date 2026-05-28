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

const PRICE_IDS: Record<string, string | undefined> = {
  collector_premium: process.env.STRIPE_PRICE_PREMIUM,
  dealer: process.env.STRIPE_PRICE_DEALER,
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tier, return_url } = await req.json() as { tier: string; return_url?: string }

  const priceId = PRICE_IDS[tier]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const db = getServiceDb()

  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id as string | null

  if (!customerId) {
    const { data: authUser } = await db.auth.admin.getUserById(user.id)
    const customer = await stripe.customers.create({
      email: authUser.user?.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const successUrl = return_url
    ? `${appUrl}${return_url}?upgraded=1`
    : `${appUrl}/sell?upgraded=1`

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: `${appUrl}${return_url ?? '/sell'}`,
    metadata: {
      supabase_user_id: user.id,
      target_tier: tier,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        target_tier: tier,
      },
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
