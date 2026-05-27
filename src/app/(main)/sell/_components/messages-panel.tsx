'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Loader2, MessageCircle, Send, Package, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getOrCreateUserKeyPair,
  unwrapConversationKey,
  encryptMessage,
  decryptMessage,
} from '@/lib/e2e-crypto'
import { createClient } from '@/lib/supabase/client'

interface ConversationSummary {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  my_key_encrypted: string
  last_message_at: string | null
  unread: number
  listings: { title: string; images: string[] | null } | null
  buyer: { display_name: string | null; username: string | null; avatar_url: string | null } | null
  seller: { display_name: string | null; username: string | null; avatar_url: string | null } | null
}

interface DecryptedMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export function MessagesPanel() {
  const supabase = createClient()
  const [loading, setLoading]   = useState(true)
  const [convos, setConvos]     = useState<ConversationSummary[]>([])
  const [selected, setSelected] = useState<ConversationSummary | null>(null)
  const [aesKey, setAesKey]     = useState<CryptoKey | null>(null)
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [text, setText]         = useState('')
  const [sending, setSending]   = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        setCurrentUserId(user.id)

        // Ensure seller has keys initialised
        await getOrCreateUserKeyPair()

        const res = await fetch('/api/conversations')
        const json = await res.json()
        if (!cancelled) setConvos(json.conversations ?? [])
      } catch (err) {
        console.error('MessagesPanel load error', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openConversation(conv: ConversationSummary) {
    setSelected(conv)
    setMessages([])
    setMsgLoading(true)
    try {
      const { privateKey } = await getOrCreateUserKeyPair()
      const key = await unwrapConversationKey(conv.my_key_encrypted, privateKey)
      setAesKey(key)

      const res = await fetch(`/api/conversations/${conv.id}/messages`)
      const json = await res.json()

      const decrypted: DecryptedMessage[] = await Promise.all(
        (json.messages ?? []).map(async (m: { id: string; sender_id: string; content_encrypted: string; iv: string; created_at: string }) => ({
          id: m.id,
          sender_id: m.sender_id,
          content: await decryptMessage(m.content_encrypted, m.iv, key),
          created_at: m.created_at,
        }))
      )
      setMessages(decrypted)

      // Mark read locally
      setConvos(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))
    } catch (err) {
      console.error('Open conversation error', err)
      toast.error('Failed to load conversation')
    } finally {
      setMsgLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !aesKey || !selected) return

    setSending(true)
    try {
      const { encrypted, iv } = await encryptMessage(text.trim(), aesKey)
      const res = await fetch(`/api/conversations/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentEncrypted: encrypted, iv }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to send')
        return
      }
      setMessages(prev => [
        ...prev,
        {
          id: json.message.id,
          sender_id: currentUserId!,
          content: text.trim(),
          created_at: json.message.created_at,
        },
      ])
      setText('')
    } catch (err) {
      console.error('Send error', err)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Chat view
  if (selected) {
    const otherParty = selected.buyer_id === currentUserId ? selected.seller : selected.buyer
    const otherName = otherParty?.display_name ?? `@${otherParty?.username ?? 'user'}`

    return (
      <div className="flex flex-col rounded-xl border border-border overflow-hidden" style={{ height: '560px' }}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => { setSelected(null); setAesKey(null); setMessages([]) }}
            className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{selected.listings?.title ?? 'Listing'}</p>
            <p className="text-xs text-muted-foreground">{otherName}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {msgLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">No messages yet</p>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isMe
                        ? 'bg-foreground text-background rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-background/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-border flex-shrink-0 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !text.trim() || !aesKey}
            className="h-9 w-9 rounded-xl flex-shrink-0"
          >
            {sending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </Button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground pb-2.5">
          Messages are end-to-end encrypted
        </p>
      </div>
    )
  }

  // Inbox list
  if (convos.length === 0) {
    return (
      <div className="text-center py-24 border border-dashed border-border rounded-2xl">
        <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
        <p className="text-xs text-muted-foreground mt-1">Buyers can message you from your listing pages</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
      {convos.map(conv => {
        const otherParty = conv.buyer_id === currentUserId ? conv.seller : conv.buyer
        const otherName = otherParty?.display_name ?? `@${otherParty?.username ?? 'user'}`
        const thumb = conv.listings?.images?.[0]

        return (
          <button
            key={conv.id}
            onClick={() => openConversation(conv)}
            className="w-full flex items-center gap-4 px-4 py-3.5 bg-card hover:bg-muted/40 transition-colors text-left"
          >
            {/* Listing thumbnail */}
            <div className="h-11 w-11 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 relative">
              {thumb ? (
                <Image src={thumb} alt={conv.listings?.title ?? ''} fill sizes="44px" className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{conv.listings?.title ?? 'Listing'}</p>
              <p className="text-xs text-muted-foreground">{otherName}</p>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {conv.last_message_at && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(conv.last_message_at).toLocaleDateString()}
                </p>
              )}
              {conv.unread > 0 && (
                <Badge className="text-[10px] h-4 min-w-4 px-1 justify-center">
                  {conv.unread}
                </Badge>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
