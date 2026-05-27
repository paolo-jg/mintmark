import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, flagReason } = body

  if (action === 'flag') {
    // Any authenticated user can flag a review
    const { error } = await supabase
      .from('reviews')
      .update({ status: 'flagged', flag_reason: flagReason ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'published')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'edit') {
    const { rating, title, body: reviewBody } = body
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const { error } = await supabase
      .from('reviews')
      .update({
        ...(rating !== undefined && { rating }),
        ...(title !== undefined && { title: title?.trim() || null }),
        ...(reviewBody !== undefined && { body: reviewBody?.trim() || null }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('reviewer_id', session.user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
