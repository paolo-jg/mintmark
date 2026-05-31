'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { AlertTriangle, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchPortfolio, fmtDollars, type ValuationResult } from './portfolio-shared'

function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
      <div className="h-7 w-52 bg-muted rounded" />
      <div className="h-28 bg-muted rounded-xl" />
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

function WishlistRow({ item }: { item: ValuationResult }) {
  return (
    <tr className="border-b border-border last:border-0">
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
            {item.isUngradedEst ? (
              <p className="text-[10px] text-blue-500 mt-0.5">ungraded estimate</p>
            ) : !item.exact && item.matchedHeader ? (
              <p className="text-[10px] text-amber-600 mt-0.5">estimate from {item.matchedHeader}</p>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60">No price data</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground whitespace-nowrap tabular-nums">
        {item.max_price ? fmtDollars(item.max_price) : '—'}
      </td>
    </tr>
  )
}

export function WishlistCostClient() {
  const { data, isLoading } = useSWR('portfolio', fetchPortfolio, { keepPreviousData: true })

  if (isLoading || !data) return <Skeleton />

  const { wishlist, wishlistTotal, wishlistValued } = data

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header + nav */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wishlist Cost</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estimated acquisition cost for coins on your wishlist.
          </p>
        </div>
        <Link
          href="/dashboard/portfolio"
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors whitespace-nowrap"
        >
          ← Portfolio Value
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3.5">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>Estimates only.</strong> Values are approximated from price guide data and should not be relied upon as accurate market valuations.
        </p>
      </div>

      {/* Summary card */}
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

      {/* Wishlist table */}
      {wishlist.length > 0 ? (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" /> Wishlist
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
                {wishlist.map(item => <WishlistRow key={item.id} item={item} />)}
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
          {(wishlist.some(i => !i.exact && i.matchedHeader && !i.isUngradedEst) || wishlist.some(i => i.isUngradedEst && i.estimatedCents !== null)) && (
            <p className="text-[11px] text-muted-foreground mt-2">
              {wishlist.some(i => !i.exact && i.matchedHeader && !i.isUngradedEst) && <span className="text-amber-600">Amber: nearest available grade used as proxy. </span>}
              {wishlist.some(i => i.isUngradedEst && i.estimatedCents !== null) && <span className="text-blue-500">Blue: median of lower circulated grades used for ungraded coin.</span>}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Add coins to your wishlist to estimate acquisition cost.</p>
        </div>
      )}

    </div>
  )
}
