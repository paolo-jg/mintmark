'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">
        {title}
      </p>
      {children}
    </div>
  )
}

function FilterLink({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left text-sm py-1 px-2 rounded-md transition-colors ${
        active
          ? 'bg-foreground text-background font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  )
}

type SeriesSidebarProps = {
  availableYears: number[]
  availableMintMarks: (string | null)[]
  availableServices: string[]
}

export function SeriesSidebar({
  availableYears,
  availableMintMarks,
  availableServices,
}: SeriesSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)

  const year = searchParams.get('year') ?? 'all'
  const mint = searchParams.get('mint') ?? 'all'
  const service = searchParams.get('service') ?? 'all'
  const listingType = searchParams.get('type') ?? 'all'
  const sort = searchParams.get('sort') ?? 'newest'

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams]
  )

  const hasActiveFilters =
    year !== 'all' || mint !== 'all' || service !== 'all' || listingType !== 'all' || sort !== 'newest'

  const clearAll = () => {
    router.push(pathname)
  }

  const sortedYears = [...availableYears].sort((a, b) => b - a)

  const mintMarkLabel = (mark: string | null) => {
    if (!mark) return 'None (Philadelphia)'
    return mark
  }

  const sidebarContent = (
    <div className="space-y-6">
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
          Clear all filters
        </button>
      )}

      {/* Sort */}
      <FilterSection title="Sort By">
        <div className="space-y-0.5">
          {[
            { label: 'Newest Listed', value: 'newest' },
            { label: 'Price: Low to High', value: 'price-asc' },
            { label: 'Price: High to Low', value: 'price-desc' },
            { label: 'Year: Newest', value: 'year-desc' },
            { label: 'Year: Oldest', value: 'year-asc' },
          ].map(opt => (
            <FilterLink
              key={opt.value}
              label={opt.label}
              active={sort === opt.value}
              onClick={() => updateParam('sort', opt.value)}
            />
          ))}
        </div>
      </FilterSection>

      <div className="h-px bg-border" />

      {/* Listing Type */}
      <FilterSection title="Listing Type">
        <div className="space-y-0.5">
          {[
            { label: 'All Listings', value: 'all' },
            { label: 'Buy Now', value: 'fixed' },
            { label: 'Auction', value: 'auction' },
          ].map(opt => (
            <FilterLink
              key={opt.value}
              label={opt.label}
              active={listingType === opt.value}
              onClick={() => updateParam('type', opt.value)}
            />
          ))}
        </div>
      </FilterSection>

      {availableServices.length > 0 && (
        <>
          <div className="h-px bg-border" />
          <FilterSection title="Grading Service">
            <div className="space-y-0.5">
              <FilterLink
                label="All Services"
                active={service === 'all'}
                onClick={() => updateParam('service', 'all')}
              />
              {availableServices.map(svc => (
                <FilterLink
                  key={svc}
                  label={svc}
                  active={service === svc}
                  onClick={() => updateParam('service', svc)}
                />
              ))}
            </div>
          </FilterSection>
        </>
      )}

      {sortedYears.length > 0 && (
        <>
          <div className="h-px bg-border" />
          <FilterSection title="Mint Year">
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              <FilterLink
                label="All Years"
                active={year === 'all'}
                onClick={() => updateParam('year', 'all')}
              />
              {sortedYears.map(y => (
                <FilterLink
                  key={y}
                  label={String(y)}
                  active={year === String(y)}
                  onClick={() => updateParam('year', String(y))}
                />
              ))}
            </div>
          </FilterSection>
        </>
      )}

      {availableMintMarks.length > 0 && (
        <>
          <div className="h-px bg-border" />
          <FilterSection title="Mint Mark">
            <div className="space-y-0.5">
              <FilterLink
                label="All Mints"
                active={mint === 'all'}
                onClick={() => updateParam('mint', 'all')}
              />
              {availableMintMarks.map(mark => (
                <FilterLink
                  key={mark ?? 'none'}
                  label={mintMarkLabel(mark)}
                  active={mint === (mark ?? 'none')}
                  onClick={() => updateParam('mint', mark ?? 'none')}
                />
              ))}
            </div>
          </FilterSection>
        </>
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
          Filters & Sort
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
