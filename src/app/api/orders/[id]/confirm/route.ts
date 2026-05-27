import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, status')
    .eq('id', orderId)
    .eq('buyer_id', user.id)
    .in('status', ['shipped', 'delivered'])
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 48 hours after buyer confirms = window to dispute before payout releases
  const autoConfirmAt = new Date(Date.now() + 2 * 86400_000).toISOString()

  await db.from('orders').update({
    status: 'delivered',
    auto_confirm_at: autoConfirmAt,
    updated_at: new Date().toISOString(),
  }).eq('id', orderId)

  return NextResponse.json({ ok: true, auto_confirm_at: autoConfirmAt })
}
