import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const listingId = searchParams.get('listingId')

  let query = supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      buyer_key_encrypted,
      seller_key_encrypted,
      last_message_at,
      buyer_unread,
      seller_unread,
      created_at,
      listings(title, images),
      buyer:profiles!buyer_id(display_name, username, avatar_url),
      seller:profiles!seller_id(display_name, username, avatar_url)
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (listingId) {
    query = query.eq('listing_id', listingId).eq('buyer_id', user.id)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach unread count for current user and the conversation AES key for them
  const conversations = (data ?? []).map(conv => {
    const isBuyer = conv.buyer_id === user.id
    return {
      ...conv,
      unread: isBuyer ? conv.buyer_unread : conv.seller_unread,
      my_key_encrypted: isBuyer ? conv.buyer_key_encrypted : conv.seller_key_encrypted,
    }
  })

  return NextResponse.json({ conversations })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    listingId: string
    buyerKeyEncrypted: string
    sellerKeyEncrypted: string
    publicKey?: JsonWebKey
    sellerId: string
  }

  const { listingId, buyerKeyEncrypted, sellerKeyEncrypted, publicKey, sellerId } = body

  if (!listingId || !buyerKeyEncrypted || !sellerKeyEncrypted || !sellerId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Save buyer's public key if provided
  if (publicKey) {
    await supabase
      .from('profiles')
      .update({ public_key: JSON.stringify(publicKey) })
      .eq('id', user.id)
  }

  // Create the conversation (unique constraint on listing_id + buyer_id handles duplicates)
  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: sellerId,
      buyer_key_encrypted: buyerKeyEncrypted,
      seller_key_encrypted: sellerKeyEncrypted,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already exists — return existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', user.id)
        .single()
      return NextResponse.json({ conversation: existing })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conversation: conv })
}
