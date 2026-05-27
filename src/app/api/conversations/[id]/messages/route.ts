import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch conversation and verify participation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, buyer_key_encrypted, seller_key_encrypted')
    .eq('id', conversationId)
    .single()

  if (convErr || !conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBuyer  = conv.buyer_id  === user.id
  const isSeller = conv.seller_id === user.id
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch messages
  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, sender_id, content_encrypted, iv, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // Reset unread count for the calling user
  const unreadField = isBuyer ? 'buyer_unread' : 'seller_unread'
  await supabase
    .from('conversations')
    .update({ [unreadField]: 0 })
    .eq('id', conversationId)

  const myKeyEncrypted = isBuyer ? conv.buyer_key_encrypted : conv.seller_key_encrypted

  return NextResponse.json({
    messages: messages ?? [],
    conversationKey: myKeyEncrypted,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify participation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id')
    .eq('id', conversationId)
    .single()

  if (convErr || !conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBuyer  = conv.buyer_id  === user.id
  const isSeller = conv.seller_id === user.id
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { contentEncrypted: string; iv: string }
  const { contentEncrypted, iv } = body

  if (!contentEncrypted || !iv) {
    return NextResponse.json({ error: 'contentEncrypted and iv are required' }, { status: 400 })
  }

  // Insert message
  const { data: message, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content_encrypted: contentEncrypted,
      iv,
    })
    .select('id, sender_id, content_encrypted, iv, created_at')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Update conversation: last_message_at + increment other party's unread
  const otherUnreadField = isBuyer ? 'seller_unread' : 'buyer_unread'

  // Use rpc-style raw sql increment isn't available on anon client,
  // so fetch current value and increment manually
  const { data: convCurrent } = await supabase
    .from('conversations')
    .select(`${otherUnreadField}`)
    .eq('id', conversationId)
    .single()

  const currentUnread = (convCurrent as Record<string, number> | null)?.[otherUnreadField] ?? 0

  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      [otherUnreadField]: currentUnread + 1,
    })
    .eq('id', conversationId)

  return NextResponse.json({ message })
}
