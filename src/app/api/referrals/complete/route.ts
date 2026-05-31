import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceDb } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { referral_code, chosen_tier } = await req.json() as { referral_code: string; chosen_tier?: string }
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

  // Referee gets 1 month free of whichever paid tier they chose
  const refereeTier = chosen_tier === 'dealer' ? 'dealer' : 'collector_premium'
  const refereeFreeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await db.from('profiles').update({
    subscription_tier: refereeTier,
    subscription_free_until: refereeFreeUntil,
  }).eq('id', user.id)

  // Referrer gets 1 free month, capped at 12 total (1 year max).
  const CAP = 12
  const creditMonths = referrer.subscription_credit_months ?? 0
  if (creditMonths < CAP) {
    const referrerRewardTier = referrer.subscription_tier === 'dealer' ? 'dealer' : 'collector_premium'
    const baseTime = referrer.subscription_free_until
      ? Math.max(Date.now(), new Date(referrer.subscription_free_until).getTime())
      : Date.now()
    const newFreeUntil = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString()

    await db.from('profiles').update({
      subscription_tier: referrerRewardTier,
      subscription_credit_months: creditMonths + 1,
      subscription_free_until: newFreeUntil,
    }).eq('id', referrer.id)
  }
  // If already at cap, referral is still recorded but no additional free months are granted.

  return NextResponse.json({ ok: true })
}
