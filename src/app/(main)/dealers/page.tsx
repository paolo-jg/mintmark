import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Star, Store } from 'lucide-react'

type Tier =
  | 'dealer_basic'
  | 'dealer_standard'
  | 'dealer_premium'

const TIER_LABEL: Record<string, string> = {
  dealer_basic:    'Dealer Basic',
  dealer_standard: 'Dealer Standard',
  dealer_premium:  'Dealer Premium',
}

// Higher = better rank for tie-breaking within same rating
const TIER_RANK: Record<string, number> = {
  dealer_basic:    4,
  dealer_standard: 5,
  dealer_premium:  6,
}

interface DealerProfile {
  id: string
  email: string
  display_name: string | null
  dealer_logo_url: string | null
  dealer_description: string | null
  average_rating: number
  rating_count: number
  subscription_tier: string
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
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

export default async function DealersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: dealers } = await supabase
    .from('profiles')
    .select('id, email, display_name, dealer_logo_url, dealer_description, average_rating, rating_count, subscription_tier')
    .like('subscription_tier', 'dealer_%')

  // Sort: average_rating DESC, tier rank DESC, rating_count DESC
  const sorted = (dealers ?? [] as DealerProfile[]).sort((a, b) => {
    if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating
    const tierDiff = (TIER_RANK[b.subscription_tier] ?? 0) - (TIER_RANK[a.subscription_tier] ?? 0)
    if (tierDiff !== 0) return tierDiff
    return b.rating_count - a.rating_count
  })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dealers</h1>
        <p className="text-sm text-muted-foreground mt-1">Verified coin dealers on Pedigree Coins</p>
      </div>

      {!sorted.length ? (
        <div className="text-center py-24 border border-dashed border-border rounded-2xl">
          <Store className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No dealers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(dealer => {
            const name = dealer.display_name ?? dealer.email
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
                      <img
                        src={dealer.dealer_logo_url}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
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

                {/* Rating */}
                <StarRating rating={dealer.average_rating} count={dealer.rating_count} />

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
