'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Star, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DealerProfile {
  id: string
  email: string
  display_name: string | null
  dealer_logo_url: string | null
  dealer_description: string | null
  average_rating: number
  rating_count: number
  completed_orders_count: number
  subscription_tier: string
}

// Bayesian average: pull new dealers toward the global mean until they've
// accumulated enough reviews. Then break ties by completed order volume.
const PRIOR_MEAN = 3.8   // slightly below "good" so unreviewed dealers don't rank first
const PRIOR_WEIGHT = 5   // minimum review count before the rating dominates

function dealerScore(d: DealerProfile): number {
  return (PRIOR_MEAN * PRIOR_WEIGHT + d.average_rating * d.rating_count) /
    (PRIOR_WEIGHT + d.rating_count)
}

export interface DealersData {
  dealers: DealerProfile[]
  unauthorized: boolean
}

const TIER_LABEL: Record<string, string> = {
  dealer: 'Dealer',
}

// ── Data fetcher (exported so the prefetcher can import it) ───────────────────

export async function fetchDealersData(): Promise<DealersData> {
  const db = createClient()
  const { data: { session } } = await db.auth.getSession()
  if (!session) return { dealers: [], unauthorized: true }

  const { data } = await db
    .from('profiles')
    .select('id, email, display_name, dealer_logo_url, dealer_description, average_rating, rating_count, completed_orders_count, subscription_tier')
    .eq('subscription_tier', 'dealer')

  const sorted = ((data ?? []) as DealerProfile[]).sort((a, b) => {
    const scoreDiff = dealerScore(b) - dealerScore(a)
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff
    return b.completed_orders_count - a.completed_orders_count
  })

  return { dealers: sorted, unauthorized: false }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="h-3.5 w-3.5 fill-foreground text-foreground" />
        ))}
        {half && (
          <span className="relative inline-block h-3.5 w-3.5">
            <Star className="absolute h-3.5 w-3.5 text-muted-foreground" />
            <span className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
            </span>
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="h-3.5 w-3.5 text-muted-foreground" />
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {rating > 0 ? rating.toFixed(1) : 'No ratings'}{count > 0 ? ` (${count})` : ''}
      </span>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

export function DealersClient() {
  const router = useRouter()
  const { data } = useSWR('dealers-list', fetchDealersData, {
    keepPreviousData: true,
  })

  // Redirect if session is gone - handled server-side by proxy in production,
  // but SWR may catch it client-side on direct navigation.
  useEffect(() => {
    if (data?.unauthorized) router.replace('/auth/login')
  }, [data?.unauthorized, router])

  const dealers = data?.dealers ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dealers</h1>
        <p className="text-sm text-muted-foreground mt-1">Verified coin dealers on Pedigree Coins</p>
      </div>

      {!data ? (
        // Skeleton - renders instantly while SWR loads
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="space-y-1.5">
                <div className="h-2.5 bg-muted rounded w-full" />
                <div className="h-2.5 bg-muted rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : !dealers.length ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl">
          <Store className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No dealers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dealers.map(dealer => {
            const name      = dealer.display_name ?? dealer.email
            const tierLabel = TIER_LABEL[dealer.subscription_tier] ?? dealer.subscription_tier

            return (
              <Link
                key={dealer.id}
                href={`/sellers/${dealer.id}`}
                className="rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors p-5 flex flex-col gap-3"
              >
                {/* Logo + name */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                    {dealer.dealer_logo_url ? (
                      <img src={dealer.dealer_logo_url} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
                      {tierLabel}
                    </Badge>
                  </div>
                </div>

                {/* Rating + completed orders */}
                <div className="space-y-1">
                  <StarRating rating={dealer.average_rating} count={dealer.rating_count} />
                  {dealer.completed_orders_count > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {dealer.completed_orders_count} sale{dealer.completed_orders_count !== 1 ? 's' : ''} completed
                    </p>
                  )}
                </div>

                {/* Description snippet */}
                {dealer.dealer_description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {dealer.dealer_description}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
