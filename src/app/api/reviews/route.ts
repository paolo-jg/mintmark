import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { orderId, sellerId, rating, title, body: reviewBody } = body

  if (!orderId || !sellerId || !rating) {
    return NextResponse.json({ error: 'orderId, sellerId, and rating are required' }, { status: 400 })
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }
  if (title && title.length > 120) {
    return NextResponse.json({ error: 'Title must be 120 characters or fewer' }, { status: 400 })
  }
  if (reviewBody && reviewBody.length > 1000) {
    return NextResponse.json({ error: 'Review must be 1000 characters or fewer' }, { status: 400 })
  }

  // Verify the order belongs to this buyer and is complete
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', orderId)
    .eq('buyer_id', session.user.id)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.status !== 'complete') {
    return NextResponse.json({ error: 'Can only review completed orders' }, { status: 400 })
  }
  if (order.seller_id !== sellerId) {
    return NextResponse.json({ error: 'Seller mismatch' }, { status: 400 })
  }

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      order_id: orderId,
      reviewer_id: session.user.id,
      seller_id: sellerId,
      rating,
      title: title?.trim() || null,
      body: reviewBody?.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You have already reviewed this order' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: review.id }, { status: 201 })
}
