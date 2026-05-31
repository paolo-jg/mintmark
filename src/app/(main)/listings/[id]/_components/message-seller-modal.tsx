'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Send, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  getOrCreateUserKeyPair,
  importPublicKey,
  generateConversationKey,
  wrapConversationKey,
  unwrapConversationKey,
  encryptMessage,
  decryptMessage,
} from '@/lib/e2e-crypto'
import { createClient } from '@/lib/supabase/client'

interface DecryptedMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface Props {
  listingId: string
  sellerId: string
  sellerPublicKeyJwk: JsonWebKey | null
  onClose: () => void
}

export function MessageSellerModal({ listingId, sellerId, sellerPublicKeyJwk, onClose }: Props) {
  const supabase = createClient()
  const [loading, setLoading]             = useState(true)
  const [sending, setSending]             = useState(false)
  const [text, setText]                   = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [aesKey, setAesKey]               = useState<CryptoKey | null>(null)
  const [messages, setMessages]           = useState<DecryptedMessage[]>([])
  const [noKey, setNoKey]                 = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        setCurrentUserId(user.id)

        if (!sellerPublicKeyJwk) {
          setNoKey(true)
          setLoading(false)
          return
        }

        // Ensure buyer has a key pair
        const { publicKeyJwk: buyerPublicKeyJwk, privateKey: buyerPrivateKey } =
          await getOrCreateUserKeyPair()

        // Check for existing conversation
        const convRes = await fetch(`/api/conversations?listingId=${listingId}`)
        const convJson = await convRes.json()
        const existing = convJson.conversations?.[0]

        if (existing) {
          setConversationId(existing.id)
          // Unwrap the AES key for this user
          const unwrapped = await unwrapConversationKey(existing.my_key_encrypted, buyerPrivateKey)
          setAesKey(unwrapped)

          // Load messages
          const msgRes = await fetch(`/api/conversations/${existing.id}/messages`)
          const msgJson = await msgRes.json()

          const decrypted: DecryptedMessage[] = await Promise.all(
            (msgJson.messages ?? []).map(async (m: { id: string; sender_id: string; content_encrypted: string; iv: string; created_at: string }) => ({
              id: m.id,
              sender_id: m.sender_id,
              content: await decryptMessage(m.content_encrypted, m.iv, unwrapped),
              created_at: m.created_at,
            }))
          )
          if (!cancelled) setMessages(decrypted)
        } else {
          // New conversation - generate AES key and wrap for both parties
          const sellerPubKey  = await importPublicKey(sellerPublicKeyJwk)
          const buyerPubKey   = await importPublicKey(buyerPublicKeyJwk)
          const convKey       = await generateConversationKey()
          const buyerWrapped  = await wrapConversationKey(convKey, buyerPubKey)
          const sellerWrapped = await wrapConversationKey(convKey, sellerPubKey)

          if (!cancelled) {
            setAesKey(convKey)
            // Store wrapped keys + buyer public key ready for when first message is sent
            ;(window as Window & { _pendingConvKeys?: { buyerWrapped: string; sellerWrapped: string; buyerPublicKeyJwk: JsonWebKey } })._pendingConvKeys = {
              buyerWrapped,
              sellerWrapped,
              buyerPublicKeyJwk,
            }
          }
        }
      } catch (err) {
        console.error('Messaging init error', err)
        toast.error('Failed to initialize messaging')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !aesKey) return

    setSending(true)
    try {
      let convId = conversationId

      // Create conversation if needed
      if (!convId) {
        const pending = (window as Window & { _pendingConvKeys?: { buyerWrapped: string; sellerWrapped: string; buyerPublicKeyJwk: JsonWebKey } })._pendingConvKeys
        if (!pending) {
          toast.error('Encryption keys not ready')
          return
        }
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId,
            sellerId,
            buyerKeyEncrypted: pending.buyerWrapped,
            sellerKeyEncrypted: pending.sellerWrapped,
            publicKey: pending.buyerPublicKeyJwk,
          }),
        })
        const createJson = await createRes.json()
        if (!createRes.ok) {
          toast.error(createJson.error ?? 'Failed to start conversation')
          return
        }
        convId = createJson.conversation.id
        setConversationId(convId)
        delete (window as Window & { _pendingConvKeys?: unknown })._pendingConvKeys
      }

      const { encrypted, iv } = await encryptMessage(text.trim(), aesKey)
      const msgRes = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentEncrypted: encrypted, iv }),
      })
      const msgJson = await msgRes.json()
      if (!msgRes.ok) {
        toast.error(msgJson.error ?? 'Failed to send message')
        return
      }

      setMessages(prev => [
        ...prev,
        {
          id: msgJson.message.id,
          sender_id: currentUserId!,
          content: text.trim(),
          created_at: msgJson.message.created_at,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-md border border-border flex flex-col" style={{ height: '560px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-bold">Message Seller</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : noKey ? (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold">Seller hasn't enabled messaging yet</p>
              <p className="text-sm text-muted-foreground">
                The seller needs to visit the platform before secure messaging can be established.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Message thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No messages yet. Say hello!
                </p>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
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
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="px-4 py-3 border-t border-border flex-shrink-0 flex gap-2"
            >
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
          </>
        )}
      </div>
    </div>
  )
}
