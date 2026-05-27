'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Coins, Star, TrendingUp, ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ── Grade utilities ────────────────────────────────────────────────────────────

const GRADE_ORDER = [
  'P1','FR2','AG3','G4','G6','VG8','VG10',
  'F12','F15','VF20','VF25','VF30','VF35',
  'EF40','EF45','AU50','AU55','AU58',
  'MS60','MS61','MS62','MS63','MS64','MS65','MS66','MS67','MS68','MS69','MS70',
  'PR60','PR61','PR62','PR63','PR64','PR65','PR66','PR67','PR68','PR69','PR70',
  'PF60','PF61','PF62','PF63','PF64','PF65','PF66','PF67','PF68','PF69','PF70',
]

function normalizeGrade(g: string): string {
  return g.replace(/[-\s]/g, '').toUpperCase()
}

function findNearestGrade(
  coinGrade: string,
  headers: string[],
): { headerIndex: number; exact: boolean } | null {
  const norm = normalizeGrade(coinGrade)
  const normHeaders = headers.map(h => normalizeGrade(h))

  const exactIdx = normHeaders.indexOf(norm)
  if (exactIdx !== -1) return { headerIndex: exactIdx, exact: true }

  const coinPos = GRADE_ORDER.indexOf(norm)
  if (coinPos === -1) return null

  const ranked = normHeaders
    .map((h, i) => ({ i, pos: GRADE_ORDER.indexOf(h) }))
    .filter(x => x.pos !== -1)
    .sort((a, b) => Math.abs(a.pos - coinPos) - Math.abs(b.pos - coinPos))

  if (ranked.length === 0) return null
  return { headerIndex: ranked[0].i, exact: false }
}

function parsePriceCents(s: string): number | null {
  if (!s || s === 'N/A' || s === '-' || s.trim() === '') return null
  const n = parseFloat(s.replace(/[$,]/g, ''))
  return isNaN(n) ? null : Math.round(n * 100)
}

function fmtDollars(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CoinProfile {
  price_headers?: string[]
  price_row?: { label: string; prices: string[] } | null
}

interface RawItem {
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

interface ValuationResult {
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
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

async function fetchPortfolio() {
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

  function valuate(item: RawItem): ValuationResult {
    const profile = item.coin_profile as CoinProfile | null
    const headers = profile?.price_headers ?? []
    const prices = profile?.price_row?.prices ?? []
    const hasProfile = headers.length > 0 && prices.length > 0

    if (!hasProfile || !item.grade) {
      return { ...item, estimatedCents: null, matchedHeader: null, exact: false, hasProfile }
    }

    const match = findNearestGrade(item.grade, headers)
    if (!match) {
      return { ...item, estimatedCents: null, matchedHeader: null, exact: false, hasProfile }
    }

    const priceStr = prices[match.headerIndex] ?? ''
    const estimatedCents = parsePriceCents(priceStr)

    return {
      ...item,
      estimatedCents,
      matchedHeader: headers[match.headerIndex],
      exact: match.exact,
      hasProfile,
    }
  }

  const owned = items.filter(i => i.type === 'owned').map(valuate)
  const wishlist = items.filter(i => i.type === 'wishlist').map(valuate)

  const ownedTotal = owned.reduce((s, i) => s + (i.estimatedCents ?? 0), 0)
  const wishlistTotal = wishlist.reduce((s, i) => s + (i.estimatedCents ?? 0), 0)
  const ownedValued = owned.filter(i => i.estimatedCents !== null).length
  const wishlistValued = wishlist.filter(i => i.estimatedCents !== null).length

  return { owned, wishlist, ownedTotal, wishlistTotal, ownedValued, wishlistValued }
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
      <div className="h-7 w-52 bg-muted rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-28 bg-muted rounded-xl" />
        <div className="h-28 bg-muted rounded-xl" />
      </div>
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

// ── Coin row ───────────────────────────────────────────────────────────────────

function CoinRow({ item }: { item: ValuationResult }) {
  const label = [item.grading_service, item.grade].filter(Boolean).join(' ')
  const dateLabel = item.year
    ? `${item.year}${item.mint_mark ? `-${item.mint_mark}` : ''}`
    : null

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium leading-snug">{item.coin_name ?? '—'}</p>
        {dateLabel && <p className="text-xs text-muted-foreground">{dateLabel}</p>}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {label || '—'}
      </td>
      <td className="py-3 text-sm text-right whitespace-nowrap">
        {item.estimatedCents !== null ? (
          <div>
            <span className="font-semibold tabular-nums">{fmtDollars(item.estimatedCents)}</span>
            {!item.exact && item.matchedHeader && (
              <p className="text-[10px] text-amber-600 mt-0.5">
                ~via {item.matchedHeader}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60">
            {item.hasProfile ? 'Grade not matched' : 'No price data'}
          </span>
        )}
      </td>
    </tr>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PortfolioClient() {
  const { data, isLoading } = useSWR('portfolio', fetchPortfolio, { keepPreviousData: true })

  if (isLoading || !data) return <Skeleton />

  const { owned, wishlist, ownedTotal, wishlistTotal, ownedValued, wishlistValued } = data

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Valuation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimated values based on scraped market price data.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3.5">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Estimates only.</strong> Values are approximated from scraped price guide data and should not be relied upon as accurate market valuations. For coins where the exact grade is not in the price table, the nearest available grade is used as a proxy (shown in amber). Actual transaction prices may differ significantly based on eye appeal, certification, demand, and market conditions.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Coins className="h-4 w-4" /> Collection Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{fmtDollars(ownedTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {ownedValued} of {owned.length} coin{owned.length !== 1 ? 's' : ''} priced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" /> Wishlist Acquisition Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{fmtDollars(wishlistTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {wishlistValued} of {wishlist.length} coin{wishlist.length !== 1 ? 's' : ''} priced
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collection breakdown */}
      {owned.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" /> Your Collection
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Coin</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Grade</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Est. Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border px-4">
                {owned.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium leading-snug">{item.coin_name ?? '—'}</p>
                      {item.year && (
                        <p className="text-xs text-muted-foreground">
                          {item.year}{item.mint_mark ? `-${item.mint_mark}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {[item.grading_service, item.grade].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {item.estimatedCents !== null ? (
                        <div>
                          <span className="font-semibold tabular-nums">{fmtDollars(item.estimatedCents)}</span>
                          {!item.exact && item.matchedHeader && (
                            <p className="text-[10px] text-amber-600 mt-0.5">~via {item.matchedHeader}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">
                          {item.hasProfile ? 'Grade not matched' : 'No price data'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20 border-t border-border">
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-right tabular-nums">{fmtDollars(ownedTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {owned.some(i => !i.exact && i.matchedHeader) && (
            <p className="text-[11px] text-amber-600 mt-2">
              Amber prices use the nearest available grade as a proxy.
            </p>
          )}
        </div>
      )}

      {/* Wishlist breakdown */}
      {wishlist.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" /> Wishlist Cost Estimate
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Coin</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target Grade</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Market Est.</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Max</th>
                </tr>
              </thead>
              <tbody>
                {wishlist.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium leading-snug">{item.coin_name ?? '—'}</p>
                      {item.year && (
                        <p className="text-xs text-muted-foreground">
                          {item.year}{item.mint_mark ? `-${item.mint_mark}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {[item.grading_service, item.grade].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      {item.estimatedCents !== null ? (
                        <div>
                          <span className="font-semibold tabular-nums">{fmtDollars(item.estimatedCents)}</span>
                          {!item.exact && item.matchedHeader && (
                            <p className="text-[10px] text-amber-600 mt-0.5">~via {item.matchedHeader}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">
                          {item.hasProfile ? 'Grade not matched' : 'No price data'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground whitespace-nowrap tabular-nums">
                      {item.max_price ? fmtDollars(item.max_price) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/20 border-t border-border">
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-right tabular-nums">{fmtDollars(wishlistTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {wishlist.some(i => !i.exact && i.matchedHeader) && (
            <p className="text-[11px] text-amber-600 mt-2">
              Amber prices use the nearest available grade as a proxy.
            </p>
          )}
        </div>
      )}

      {owned.length === 0 && wishlist.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Coins className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Add coins to your collection or wishlist to see valuations.</p>
        </div>
      )}
    </div>
  )
}
