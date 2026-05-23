'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { placeholderGradient } from './utils'
import { CoinCardImage } from './coin-card-image'

export interface SeriesRow {
  slug: string
  name: string
  dateRange: string
  denomination?: string
  image?: string
  imageReverse?: string
  dualSide?: boolean
  count: number
  fixedCount: number
  auctionCount: number
  minPrice: number | null
}

export interface CategoryRow {
  slug: string
  name: string
  thumb: string | null
  totalListings: number
  fixedListings: number
  auctionListings: number
  series: SeriesRow[]
}

export function DirectoryClient({ categories }: { categories: CategoryRow[] }) {
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set())

  function toggle(slug: string) {
    setOpenSlugs(prev => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <nav className="flex flex-col gap-3 mt-2">
      {categories.map(cat => {
        const isOpen = openSlugs.has(cat.slug)

        return (
          <div
            key={cat.slug}
            className={`rounded-2xl border bg-card shadow-sm transition-all duration-300 overflow-hidden ${
              isOpen
                ? 'border-foreground/20 shadow-md'
                : 'border-border/60 hover:border-foreground/15 hover:shadow-md'
            }`}
          >
            {/* ── Header ── */}
            <button
              onClick={() => toggle(cat.slug)}
              className="w-full group flex items-center gap-5 px-5 py-5 cursor-pointer"
            >
              {/* Thumbnail — only visible when open */}
              <div
                className={`shrink-0 rounded-xl overflow-hidden bg-white dark:bg-zinc-50 border border-border/40 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isOpen
                    ? 'h-0 w-0 opacity-0 border-0'
                    : 'h-28 w-28 opacity-100'
                }`}
              >
                {cat.thumb ? (
                  <img
                    src={cat.thumb}
                    alt=""
                    className="h-full w-full object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div
                    className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.06]"
                    style={{ background: placeholderGradient(cat.slug) }}
                  />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0 text-left">
                <p
                  className={`font-semibold text-foreground leading-tight transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isOpen ? 'text-[22px]' : 'text-[20px]'
                  }`}
                >
                  {cat.name}
                </p>
              </div>

              {/* Listing status */}
              {cat.totalListings > 0 ? (
                <div className="shrink-0 text-left">
                  {cat.fixedListings > 0 && (
                    <p className="text-[15px] font-semibold text-green-800 dark:text-green-300 tabular-nums leading-snug">
                      {cat.fixedListings} buy now
                    </p>
                  )}
                  {cat.auctionListings > 0 && (
                    <p className="text-[15px] font-semibold text-blue-800 dark:text-blue-300 tabular-nums leading-snug">
                      {cat.auctionListings} at auction
                    </p>
                  )}
                </div>
              ) : (
                <p className="shrink-0 text-[17px] font-medium text-muted-foreground/70">
                  No listings
                </p>
              )}

              {/* Chevron */}
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-muted-foreground/40 transition-all duration-500 ease-in-out ${
                  isOpen ? 'rotate-180 text-muted-foreground/70' : 'group-hover:text-muted-foreground/60'
                }`}
              />
            </button>

            {/* ── Expandable grid ── */}
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/60 mx-5" />
                <div className="px-5 pt-4 pb-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {cat.series.map(series => {
                      const showImage = !!series.image && !series.dualSide
                      return (
                        <Link
                          key={series.slug}
                          href={`/listings/series/${series.slug}`}
                          className="group block min-w-0 rounded-2xl overflow-hidden border border-border/60 bg-background shadow-sm hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out"
                        >
                          {/* Image */}
                          {showImage ? (
                            <CoinCardImage
                              image={series.image!}
                              imageReverse={series.imageReverse}
                              name={series.name}
                            />
                          ) : (
                            <div
                              className="aspect-square"
                              style={{ background: placeholderGradient(series.slug) }}
                            />
                          )}

                          {/* Info */}
                          <div className="px-3.5 pt-3 pb-3.5 space-y-1">
                            <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60">
                              {series.dateRange}
                              {series.denomination && (
                                <span className="font-mono normal-case tracking-normal">
                                  {' '}· {series.denomination}
                                </span>
                              )}
                            </p>
                            <p className="text-[13px] font-semibold leading-snug line-clamp-2 text-foreground">
                              {series.name}
                            </p>
                            <div className="pt-1.5">
                              {series.count > 0 ? (
                                <div>
                                  <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    {series.count} available
                                  </p>
                                  {series.minPrice !== null && (
                                    <p className="text-[12px] font-medium text-foreground/60 tabular-nums">
                                      from {(series.minPrice / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[13px] font-medium text-muted-foreground/70">No listings</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
