// Shared types, grade utilities, and data fetcher for portfolio pages.

import { createClient } from '@/lib/supabase/client'

// ── Grade utilities ────────────────────────────────────────────────────────────

export const GRADE_ORDER = [
  'P1','FR2','AG3','G4','G6','VG8','VG10',
  'F12','F15','VF20','VF25','VF30','VF35',
  'EF40','EF45','AU50','AU55','AU58',
  'MS60','MS61','MS62','MS63','MS64','MS65','MS66','MS67','MS68','MS69','MS70',
  'PR60','PR61','PR62','PR63','PR64','PR65','PR66','PR67','PR68','PR69','PR70',
  'PF60','PF61','PF62','PF63','PF64','PF65','PF66','PF67','PF68','PF69','PF70',
]

export function normalizeGrade(g: string): string {
  return g.replace(/[-\s]/g, '').toUpperCase()
}

// Returns all header candidates ranked by nearness to coinGrade (exact first).
// Caller walks the list until it finds one with a non-null price.
export function rankGradeCandidates(
  coinGrade: string,
  headers: string[],
): { headerIndex: number; exact: boolean }[] {
  const norm = normalizeGrade(coinGrade)
  const normHeaders = headers.map(h => normalizeGrade(h))

  const exactIdx = normHeaders.indexOf(norm)
  const coinPos = GRADE_ORDER.indexOf(norm)

  const withPos = normHeaders
    .map((h, i) => ({ i, pos: GRADE_ORDER.indexOf(h) }))
    .filter(x => x.pos !== -1)

  if (withPos.length === 0) {
    // No known grades in headers - return exact match only (or nothing)
    return exactIdx !== -1 ? [{ headerIndex: exactIdx, exact: true }] : []
  }

  let ranked: { headerIndex: number; exact: boolean }[]

  if (coinPos !== -1) {
    // Grade is in GRADE_ORDER - sort by distance
    ranked = [...withPos]
      .sort((a, b) => Math.abs(a.pos - coinPos) - Math.abs(b.pos - coinPos))
      .map(x => ({ headerIndex: x.i, exact: false }))
  } else {
    // Grade not in our scale - sort by position ascending (consistent proxy order)
    ranked = [...withPos]
      .sort((a, b) => a.pos - b.pos)
      .map(x => ({ headerIndex: x.i, exact: false }))
  }

  // Put exact match at front if it exists
  if (exactIdx !== -1) {
    ranked = [{ headerIndex: exactIdx, exact: true }, ...ranked.filter(x => x.headerIndex !== exactIdx)]
  }

  return ranked
}

export function parsePriceCents(s: string): number | null {
  if (!s || s === 'N/A' || s === '-' || s.trim() === '') return null
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? null : Math.round(n * 100)
}

export function fmtDollars(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CoinProfile {
  price_headers?: string[]
  price_row?: { label: string; prices: string[] } | null
}

export interface RawItem {
  id: string
  type: string
  status: string | null
  coin_name: string | null
  grade: string | null
  grading_service: string | null
  year: number | null
  mint_mark: string | null
  max_price: number | null
  coin_profile: unknown
}

export interface ValuationResult {
  id: string
  coin_name: string | null
  grade: string | null
  grading_service: string | null
  year: number | null
  mint_mark: string | null
  max_price: number | null
  estimatedCents: number | null
  matchedHeader: string | null
  exact: boolean
  hasProfile: boolean
  isUngradedEst: boolean
}

// ── Ungraded price estimation ─────────────────────────────────────────────────

export function estimateUngradedCents(profile: CoinProfile | null): { cents: number; label: string } | null {
  if (!profile?.price_headers || !profile?.price_row?.prices) return null

  const headers = profile.price_headers
  const prices = profile.price_row.prices

  const candidates: { grade: string; cents: number; pos: number }[] = []

  headers.forEach((header, i) => {
    const norm = normalizeGrade(header)
    if (norm.startsWith('PR') || norm.startsWith('PF')) return
    const cents = parsePriceCents(prices[i] ?? '')
    if (!cents || cents <= 0) return
    const pos = GRADE_ORDER.indexOf(norm)
    candidates.push({ grade: header, cents, pos: pos === -1 ? 999 : pos })
  })

  if (candidates.length === 0) return null

  candidates.sort((a, b) => a.pos - b.pos)

  const take = Math.max(1, Math.ceil(candidates.length * 0.6))
  const lower = candidates.slice(0, take)

  const sorted = [...lower].sort((a, b) => a.cents - b.cents)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1].cents + sorted[mid].cents) / 2)
    : sorted[mid].cents

  return { cents: median, label: lower[Math.floor(lower.length / 2)]?.grade ?? '' }
}

// ── Valuate single item ────────────────────────────────────────────────────────

export function valuate(item: RawItem): ValuationResult {
  const profile = item.coin_profile as CoinProfile | null
  const headers = profile?.price_headers ?? []
  const prices = profile?.price_row?.prices ?? []
  const hasProfile = headers.length > 0 && prices.length > 0

  if (!item.grade) {
    if (hasProfile) {
      const est = estimateUngradedCents(profile)
      if (est) {
        return { ...item, estimatedCents: est.cents, matchedHeader: est.label, exact: false, hasProfile, isUngradedEst: true }
      }
    }
    return { ...item, estimatedCents: null, matchedHeader: null, exact: false, hasProfile, isUngradedEst: true }
  }

  if (!hasProfile) {
    return { ...item, estimatedCents: null, matchedHeader: null, exact: false, hasProfile, isUngradedEst: false }
  }

  const candidates = rankGradeCandidates(item.grade, headers)
  if (candidates.length === 0) {
    return { ...item, estimatedCents: null, matchedHeader: null, exact: false, hasProfile, isUngradedEst: false }
  }

  // Walk candidates in order of nearness until we find one with a price
  for (const candidate of candidates) {
    const estimatedCents = parsePriceCents(prices[candidate.headerIndex] ?? '')
    if (estimatedCents !== null) {
      return {
        ...item,
        estimatedCents,
        matchedHeader: headers[candidate.headerIndex],
        exact: candidate.exact,
        hasProfile,
        isUngradedEst: false,
      }
    }
  }

  return { ...item, estimatedCents: null, matchedHeader: null, exact: false, hasProfile, isUngradedEst: false }
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

export async function fetchPortfolio() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data } = await supabase
    .from('collection_items')
    .select('id, type, status, coin_name, grade, grading_service, year, mint_mark, max_price, coin_profile')
    .eq('user_id', session.user.id)
    .neq('status', 'sold')
    .order('created_at', { ascending: false })

  const items = (data ?? []) as RawItem[]

  const owned = items.filter(i => i.type === 'owned').map(valuate)
  const wishlist = items.filter(i => i.type === 'wishlist').map(valuate)

  const ownedTotal = owned.reduce((s, i) => s + (i.estimatedCents ?? 0), 0)
  const wishlistTotal = wishlist.reduce((s, i) => s + (i.estimatedCents ?? 0), 0)
  const ownedValued = owned.filter(i => i.estimatedCents !== null).length
  const wishlistValued = wishlist.filter(i => i.estimatedCents !== null).length

  return { owned, wishlist, ownedTotal, wishlistTotal, ownedValued, wishlistValued }
}
