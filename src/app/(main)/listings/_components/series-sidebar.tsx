'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

const MINT_LABELS: Record<string, string> = {
  P: 'Philadelphia (P)',
  D: 'Denver (D)',
  S: 'San Francisco (S)',
  O: 'New Orleans (O)',
  CC: 'Carson City (CC)',
  W: 'West Point (W)',
  C: 'Charlotte (C)',
  D_dahlonega: 'Dahlonega (D)',
  none: 'Philadelphia',
}

function mintLabel(mark: string | null): string {
  if (!mark) return 'Philadelphia'
  return MINT_LABELS[mark] ?? mark
}

type SeriesSidebarProps = {
  availableMintMarks: (string | null)[]
  catalogYears: number[]
  yearCounts: Record<number, number>
  mintCounts: Record<string, number>
}

export function SeriesSidebar({
  availableMintMarks,
  catalogYears,
  yearCounts,
  mintCounts,
}: SeriesSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const year = searchParams.get('year') ?? 'all'
  const mint = searchParams.get('mint') ?? 'all'

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const hasActiveFilters = year !== 'all' || mint !== 'all'
  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('year')
    params.delete('mint')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const sidebarContent = (
    <div className="space-y-6">
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}

      {/* Mint marks */}
      {availableMintMarks.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">
            Mint
          </p>
          <div className="space-y-0.5">
            <MintRow
              label="All Mints"
              count={Object.values(mintCounts).reduce((a, b) => a + b, 0)}
              active={mint === 'all'}
              onClick={() => updateParam('mint', 'all')}
              showCount={mint !== 'all'}
            />
            {availableMintMarks.map(mark => {
              const key = mark ?? 'none'
              const count = mintCounts[key] ?? 0
              return (
                <MintRow
                  key={key}
                  label={mintLabel(mark)}
                  count={count}
                  active={mint === key}
                  onClick={() => updateParam('mint', key)}
                  showCount
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Years */}
      {catalogYears.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">
            Year
          </p>
          <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
            <YearRow
              label="All Years"
              count={Object.values(yearCounts).reduce((a, b) => a + b, 0)}
              active={year === 'all'}
              hasListings
              onClick={() => updateParam('year', 'all')}
              showCount={year !== 'all'}
            />
            {catalogYears.map(y => {
              const count = yearCounts[y] ?? 0
              return (
                <YearRow
                  key={y}
                  label={String(y)}
                  count={count}
                  active={year === String(y)}
                  hasListings={count > 0}
                  onClick={() => updateParam('year', String(y))}
                  showCount
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:border-foreground/40 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Mint &amp; Year
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-foreground text-background text-[10px] font-bold px-1.5 py-0.5">
              ON
            </span>
          )}
        </button>
        {mobileOpen && (
          <div className="mt-3 p-4 rounded-xl border border-border bg-background">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-52 flex-none">
        <div className="sticky top-8">
          {sidebarContent}
        </div>
      </aside>
    </>
  )
}

function MintRow({
  label, count, active, onClick, showCount,
}: {
  label: string; count: number; active: boolean; onClick: () => void; showCount: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors ${
        active
          ? 'bg-foreground text-background font-medium'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      <span className="truncate">{label}</span>
      {showCount && count > 0 && (
        <span className={`ml-2 text-xs flex-shrink-0 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function YearRow({
  label, count, active, hasListings, onClick, showCount,
}: {
  label: string; count: number; active: boolean; hasListings: boolean; onClick: () => void; showCount: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full text-left text-sm py-1 px-2 rounded-md transition-colors ${
        active
          ? 'bg-foreground text-background font-medium'
          : hasListings
            ? 'text-foreground hover:bg-muted'
            : 'text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground'
      }`}
    >
      <span>{label}</span>
      {showCount && count > 0 && (
        <span className={`ml-2 text-xs flex-shrink-0 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
          {count}
        </span>
      )}
    </button>
  )
}
