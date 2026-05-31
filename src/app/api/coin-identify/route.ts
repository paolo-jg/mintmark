import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { COIN_CATALOG } from '@/lib/coins/catalog'

// Build a compact series list for the prompt so Claude can match slugs
const SERIES_LIST = COIN_CATALOG.flatMap(cat =>
  cat.series.map(s => `${s.slug} | ${s.name} | ${s.dateRange}`)
).join('\n')

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI identification is not configured (missing ANTHROPIC_API_KEY)' }, { status: 503 })
  }

  let obverse: string, reverse: string
  try {
    const body = await req.json()
    obverse = body.obverse  // full data URL, e.g. "data:image/jpeg;base64,..."
    reverse = body.reverse
    if (!obverse || !reverse) throw new Error('Both images required')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Strip data URL prefix to get raw base64 + media type
  const parseDataUrl = (dataUrl: string): { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' } => {
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/)
    if (!match) throw new Error('Invalid image format. Only JPEG, PNG, GIF, WEBP are supported.')
    return { mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: match[2] }
  }

  let obvParsed, revParsed
  try {
    obvParsed = parseDataUrl(obverse)
    revParsed = parseDataUrl(reverse)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid image' }, { status: 400 })
  }

  const prompt = `You are a professional numismatist (coin expert) with decades of experience grading and identifying US coins.

You will be shown two images of a coin: the obverse (front) and reverse (back). Your job is to identify the coin and extract all relevant information.

**IMPORTANT - Graded slabs**: If the coin is encapsulated in a graded holder (PCGS blue holder, NGC green holder, ANACS, ICG, etc.), carefully read the label on the holder. It will contain the grading service name, grade (e.g. MS-65, VF-30), certification/cert number, and coin description. Use the label data - it is authoritative.

**For raw (ungraded) coins**: Identify from visual features - design type, date, mint mark (small letter near the date or on the reverse), and denomination.

Here are the known series slugs you must match against:
${SERIES_LIST}

Respond with a single JSON object. No prose, no markdown fences, just valid JSON:
{
  "series_slug": "<slug from the list above, or null if uncertain>",
  "coin_name": "<full descriptive name, e.g. 'Lincoln Wheat Cent'>",
  "year": <integer year, or null>,
  "mint_mark": "<single letter uppercase, e.g. S, D, CC, or null for Philadelphia>",
  "denomination": "<e.g. '1C', '25C', '$1', or null>",
  "grade": "<e.g. MS65, VF30, PR68, or null if raw/unknown>",
  "grading_service": "<PCGS | NGC | ANACS | ICG | SEGS | null>",
  "cert_number": "<certification number as a string, or null>",
  "variety": "<notable variety, e.g. 'VDB', 'Doubled Die', or null>",
  "confidence": "<high | medium | low>",
  "notes": "<brief observation about the coin's condition, toning, or any caveats, max 1 sentence>"
}`

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: obvParsed.mediaType, data: obvParsed.data },
            },
            {
              type: 'text',
              text: '(Obverse / front of the coin)',
            },
            {
              type: 'image',
              source: { type: 'base64', media_type: revParsed.mediaType, data: revParsed.data },
            },
            {
              type: 'text',
              text: '(Reverse / back of the coin)\n\n' + prompt,
            },
          ],
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim()
    const result = JSON.parse(jsonStr)
    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    console.error('[coin-identify]', e)
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'AI identification failed',
    }, { status: 500 })
  }
}
