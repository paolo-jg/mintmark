import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceDb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Runs daily. Finds profiles whose referral-granted free period has expired,
// have no active Stripe subscription, and downgrades them to collector_basic.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getServiceDb()
  const now = new Date().toISOString()

  // Find all profiles that:
  // 1. Have a paid tier (collector_premium or dealer)
  // 2. Have a subscription_free_until that's in the past
  // 3. Have no active Stripe subscription (stripe_subscription_id is null or cancelled)
  const { data: expired, error } = await db
    .from('profiles')
    .select('id, subscription_tier, subscription_free_until, stripe_subscription_id')
    .in('subscription_tier', ['collector_premium', 'dealer'])
    .lt('subscription_free_until', now)
    .not('subscription_free_until', 'is', null)
    .is('stripe_subscription_id', null)

  if (error) {
    console.error('[expire-subscriptions] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, downgraded: 0 })
  }

  const ids = expired.map(p => p.id)

  const { error: updateError } = await db
    .from('profiles')
    .update({
      subscription_tier: 'collector_basic',
      subscription_free_until: null,
      requires_plan_selection: true,
      listing_count_reset_at: now,
    })
    .in('id', ids)

  if (updateError) {
    console.error('[expire-subscriptions] update error:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  console.log(`[expire-subscriptions] downgraded ${ids.length} profiles:`, ids)
  return NextResponse.json({ ok: true, downgraded: ids.length })
}
