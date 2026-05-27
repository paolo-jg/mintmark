import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    order_id: string
    reason: string
    description: string
    evidence_urls?: string[]
  }

  if (!body.order_id || !body.reason || !body.description?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify user is the buyer on this order
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, status')
    .eq('id', body.order_id)
    .eq('buyer_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'complete') {
    return NextResponse.json({ error: 'Cannot dispute a completed order' }, { status: 400 })
  }

  // Check no open dispute already exists
  const { data: existing } = await supabase
    .from('disputes')
    .select('id')
    .eq('order_id', body.order_id)
    .not('status', 'in', '("closed")')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A dispute already exists for this order' }, { status: 400 })
  }

  const { data, error } = await supabase.from('disputes').insert({
    order_id: body.order_id,
    filed_by: user.id,
    reason: body.reason,
    description: body.description.trim(),
    evidence_urls: body.evidence_urls ?? [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark order as disputed
  await supabase
    .from('orders')
    .update({ status: 'disputed', updated_at: new Date().toISOString() })
    .eq('id', body.order_id)

  return NextResponse.json(data, { status: 201 })
}
