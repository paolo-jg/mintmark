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
  }

  if (!body.order_id || !body.reason || !body.description?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify the user is the buyer on this order and it's in a returnable state
  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, status')
    .eq('id', body.order_id)
    .eq('buyer_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const returnable = ['delivered', 'complete']
  if (!returnable.includes(order.status)) {
    return NextResponse.json({ error: 'Returns can only be requested on delivered or completed orders' }, { status: 400 })
  }

  // Idempotent: only one open return per order
  const { data: existing } = await supabase
    .from('returns')
    .select('id')
    .eq('order_id', body.order_id)
    .not('status', 'in', '("rejected","closed")')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'An active return already exists for this order' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('returns')
    .insert({
      order_id: body.order_id,
      filed_by: user.id,
      reason: body.reason,
      description: body.description.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
