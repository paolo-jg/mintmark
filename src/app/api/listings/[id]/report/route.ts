import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { reason?: string; details?: string }
  const { reason, details } = body

  if (!reason) {
    return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  }

  const validReasons = ['fraud', 'wrong_description', 'counterfeit', 'price_manipulation', 'other']
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  const { error } = await supabase
    .from('listing_reports')
    .insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      details: details ?? null,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You have already reported this listing' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
