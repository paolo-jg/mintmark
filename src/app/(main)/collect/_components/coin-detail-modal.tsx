'use client'

import { X, Coins, Star } from 'lucide-react'
import type { CollectionItem } from './collect-client'
import dynamic from 'next/dynamic'

const PriceHistoryChart = dynamic(
  () => import('@/app/(main)/listings/[id]/_components/price-history-chart'),
  { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-xl bg-muted/40" /> }
)

interface Props {
  item: CollectionItem
  onClose: () => void
}

interface CoinProfile {
  description?: string | null
  specs?: {
    designer?: string | null
    composition?: string | null
    diameter?: string | null
    weight?: string | null
  }
  key_dates?: string[]
  price_headers?: string[]
  price_row?: { label: string; prices: string[] } | null
  image_url?: string | null
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

const STATUS_LABELS: Record<string, string> = {
  owned: 'In Collection',
  for_sale: 'For Sale',
  sold: 'Sold',
}

export function CoinDetailModal({ item, onClose }: Props) {
  const profile = item.coin_profile as CoinProfile | null
  const imageUrl = item.pcgs_image_url ?? profile?.image_url ?? null
  const specs = profile?.specs
  const priceHeaders = profile?.price_headers ?? []
  const priceRow = profile?.price_row ?? null
  const hasSpecs = specs && Object.values(specs).some(Boolean)
  const hasPricing = priceHeaders.length > 0 && priceRow

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {(item.grading_service || item.grade) && (
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/50 mb-1">
                {[item.grading_service, item.grade].filter(Boolean).join(' · ')}
                {item.year && (
                  <span className="font-mono normal-case tracking-normal">
                    {' · '}{item.year}{item.mint_mark ? `-${item.mint_mark}` : ''}
                  </span>
                )}
              </p>
            )}
            <h2 className="text-xl font-bold leading-snug">{item.coin_name}</h2>
            {item.cert_number && (
              <p className="text-[12px] text-muted-foreground mt-0.5">Cert #{item.cert_number}</p>
            )}
            {item.type === 'owned' && item.status && item.status !== 'owned' && (
              <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                item.status === 'for_sale' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
              }`}>
                {STATUS_LABELS[item.status]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-6">

          {/* Image */}
          <div className="rounded-2xl overflow-hidden bg-muted/30 border border-border flex items-center justify-center aspect-video">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.coin_name}
                className="w-full h-full object-contain mix-blend-multiply"
              />
            ) : item.type === 'wishlist' ? (
              <Star className="h-16 w-16 text-muted-foreground/20" />
            ) : (
              <Coins className="h-16 w-16 text-muted-foreground/20" />
            )}
          </div>

          {/* Description */}
          {profile?.description && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">About</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{profile.description}</p>
            </div>
          )}

          {/* Specifications */}
          {hasSpecs && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Specifications</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {specs?.designer && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-0.5">Designer</p>
                    <p className="text-[13px] font-medium">{specs.designer}</p>
                  </div>
                )}
                {specs?.composition && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-0.5">Composition</p>
                    <p className="text-[13px] font-medium">{specs.composition}</p>
                  </div>
                )}
                {specs?.diameter && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-0.5">Diameter</p>
                    <p className="text-[13px] font-medium">{specs.diameter}</p>
                  </div>
                )}
                {specs?.weight && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold mb-0.5">Weight</p>
                    <p className="text-[13px] font-medium">{specs.weight}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing for this coin's year */}
          {hasPricing && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
                Pricing: {priceRow.label}
              </p>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {priceHeaders.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-muted-foreground/70 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {priceRow.prices.map((p, i) => (
                        <td key={i} className="px-3 py-2.5 font-mono text-foreground whitespace-nowrap">
                          {p}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Max price (wishlist) */}
          {item.type === 'wishlist' && item.max_price && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Max Budget</p>
              <p className="text-[15px] font-semibold">{formatPrice(item.max_price)}</p>
            </div>
          )}

          {/* Price history chart - shown for all owned/graded coins */}
          {item.grade && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Sale Price History</p>
              <PriceHistoryChart
                coinName={item.coin_name}
                year={item.year}
                mintMark={item.mint_mark}
                grade={item.grade}
                seriesSlug={item.series_slug}
              />
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Notes</p>
              <p className="text-[13px] text-muted-foreground italic">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
