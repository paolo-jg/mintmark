import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// In-memory rate limiter: 20 requests per user per 60-second window
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 20
const WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(t => now - t < WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) return false
  timestamps.push(now)
  rateLimitMap.set(userId, timestamps)
  return true
}

const BASE_SYSTEM_PROMPT = `You are a helpful assistant for Pedigree Coins, a marketplace exclusively for professionally graded numismatic coins (PCGS, NGC, ANACS, ICG). You help users navigate the platform and understand its features.

PLATFORM FEATURES:
- Browse/Buy: Explore listings by series, year, mint, grade, grading service. Fixed-price and auction listings.
- Sell: Create listings for rare coins. Two formats: fixed-price and auction (with reserve price, buy-it-now option).
- Collect: Track your coin collection. Import coins from PCGS/NGC registries using cert numbers or registry username. List directly from collection.
- Auctions: Live bidding with 1-second countdown. Bids in the last 2 minutes auto-extend the auction by 2 minutes. Reserve price = seller's minimum to sell.
- Messaging: End-to-end encrypted messages between buyers and sellers on any active listing.
- Verification: Cert number verification via PCGS and NGC for authenticity.
- Dealer storefronts: Verified dealers get a storefront page showing all their listings.

LISTING CREATION STEPS:
1. Go to Sell → Create Listing
2. Choose coin from the catalog (or enter manually)
3. Enter: grade, cert number, year, mint mark, denomination
4. Set listing type: Fixed Price or Auction
5. Fixed price: set your price + optional "Accept Offers" toggle
6. Auction: set start bid, optional reserve price, optional Buy-It-Now price, end date
7. Upload photos (obverse + reverse strongly recommended — hover shows reverse on cards)
8. Add description
9. Publish (goes live immediately if account in good standing)

COLLECTION:
- Add coins via cert number lookup (PCGS/NGC verified automatically)
- Track portfolio value over time
- "For Sale" status shows when a collection coin is actively listed
- Collection items can be listed directly from the Collect tab

PRICING & FEES:
- Collector Basic (Free): 7% buyer convenience fee, 7% seller fee + card processing, $0.50/listing, max 10 active listings/month
- Collector Premium ($9.99/mo): 1.9% buyer fee, 1.9% seller fee + processing, $0.40/listing, max 50 listings/month
- Dealer ($49.99/mo): 1% buyer fee, 0% seller fee + processing, $0 listing fee, unlimited listings
- All plans: unlimited purchases

GRADING SERVICES:
- PCGS, NGC, ANACS, ICG supported
- CAC designation shown separately
- Cert numbers are verified against official registries
- Unrare coins can also be listed

ORDERS & SHIPPING:
- After purchase, seller has 3 business days to ship
- Integrated shipping labels via Shippo
- Payment held in escrow until buyer confirms delivery
- Funds auto-release 48h after delivery if buyer doesn't dispute

RULES:
1. Only answer questions about Pedigree Coins and coin collecting/numismatics.
2. If asked about unrelated topics, politely redirect.
3. Be concise — 2-4 sentences unless detail is genuinely needed.
4. If you cannot help, say: "For further help, email support@pedigreecoins.com"
5. Never make up features that aren't described above.`

function getPageContext(pathname: string): string {
  if (pathname === '/listings' || pathname.startsWith('/listings/series/')) {
    return 'User is on the Browse/Buy page. They may be looking for coins to purchase or have questions about browsing.'
  }
  if (pathname === '/sell') {
    return 'User is on the Sell dashboard. They may have questions about managing listings or creating new ones.'
  }
  if (pathname === '/listings/new' || /^\/listings\/[^/]+\/edit$/.test(pathname)) {
    return 'User is creating or editing a listing. They may need help with listing fields or the auction setup.'
  }
  if (pathname === '/collect') {
    return 'User is on the Collection tracker. They may need help importing coins or understanding the portfolio features.'
  }
  if (pathname === '/pricing') {
    return 'User is on the Pricing page. They may be deciding which plan to choose.'
  }
  if (pathname === '/settings') {
    return 'User is in Account Settings.'
  }
  if (pathname === '/profile') {
    return 'User is editing their profile.'
  }
  // Single listing page — match after the more-specific patterns above
  if (/^\/listings\/[^/]+$/.test(pathname)) {
    return 'User is viewing a specific coin listing. They may have questions about buying, bidding, or the verification.'
  }
  return 'User is on the Pedigree Coins platform.'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!checkRateLimit(user.id)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a moment before sending another message.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let messages: Array<{ role: 'user' | 'assistant'; content: string }>
  let pathname: string
  try {
    const body = await req.json()
    messages = body.messages
    pathname = body.pathname ?? '/'
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages array required')
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const pageContext = getPageContext(pathname)
  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\nCURRENT PAGE CONTEXT: ${pageContext}`

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  return new Response(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(enc.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  )
}
