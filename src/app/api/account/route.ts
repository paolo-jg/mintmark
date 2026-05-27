import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check for active listings or pending orders before deleting
  const [{ count: activeListings }, { count: pendingOrders }] = await Promise.all([
    supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .in('status', ['active', 'reserved']),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .in('status', ['pending', 'paid', 'shipped']),
  ])

  if ((activeListings ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Please remove all active listings before deleting your account.' },
      { status: 422 }
    )
  }
  if ((pendingOrders ?? 0) > 0) {
    return NextResponse.json(
      { error: 'You have pending orders. Please resolve them before deleting your account.' },
      { status: 422 }
    )
  }

  // Use service role to delete the auth user (cascades to profiles via FK)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await serviceClient.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
