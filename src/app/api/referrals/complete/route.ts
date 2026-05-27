import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceDb } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { referral_code } = await req.json() as { referral_code: string }
  if (!referral_code) return NextResponse.json({ ok: true }) // no-op

  const db = getServiceDb()

  // Find referrer
  const { data: referrer } = await db
    .from('profiles')
    .select('id, subscription_free_until, subscription_credit_months, subscription_tier')
    .eq('referral_code', referral_code.toUpperCase())
    .single()

  if (!referrer || referrer.id === user.id) return NextResponse.json({ ok: true })

  // Idempotent: don't double-credit
  const { data: existing } = await db
    .from('referrals')
    .select('id')
    .eq('referred_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true })

  // Create referral record
  await db.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    referral_code: referral_code.toUpperCase(),
    status: 'completed',
    completed_at: new Date().toISOString(),
  })

  // Give referred user: Collector Premium free for 30 days
  const freeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await db.from('profiles').update({
    subscription_tier: 'collector_premium',
    subscription_free_until: freeUntil,
  }).eq('id', user.id)

  // Give referrer: 1 free month — stacks with each successful referral.
  // Start from the later of now or their current free_until, so months always accumulate.
  const baseTime = referrer.subscription_free_until
    ? Math.max(Date.now(), new Date(referrer.subscription_free_until).getTime())
    : Date.now()
  const newFreeUntil = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()

  await db.from('profiles').update({
    subscription_credit_months: (referrer.subscription_credit_months ?? 0) + 1,
    subscription_free_until: newFreeUntil,
  }).eq('id', referrer.id)

  return NextResponse.json({ ok: true })
}
