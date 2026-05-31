'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { SlidersHorizontal, X, Tag, Gem, CalendarDays } from 'lucide-react'

const CATEGORIES = [
  { label: 'All Types', value: 'all' },
  { label: 'Half Cents', value: 'half-cents' },
  { label: 'Large Cents', value: 'large-cents' },
  { label: 'Small Cents', value: 'small-cents' },
  { label: 'Two-Cent Pieces', value: 'two-cent-pieces' },
  { label: 'Three-Cent Pieces', value: 'three-cent-pieces' },
  { label: 'Half Dimes', value: 'half-dimes' },
  { label: 'Nickels', value: 'nickels' },
  { label: 'Dimes', value: 'dimes' },
  { label: 'Twenty-Cent Pieces', value: 'twenty-cent-pieces' },
  { label: 'Quarters', value: 'quarters' },
  { label: 'Half Dollars', value: 'half-dollars' },
  { label: 'Silver Dollars', value: 'silver-dollars' },
  { label: 'Gold Dollars', value: 'gold-dollars' },
  { label: 'Quarter Eagles ($2½)', value: 'quarter-eagles' },
  { label: 'Three-Dollar Gold', value: 'three-dollar-gold' },
  { label: 'Half Eagles ($5)', value: 'half-eagles' },
  { label: 'Eagles ($10)', value: 'eagles' },
  { label: 'Double Eagles ($20)', value: 'double-eagles' },
  { label: 'Commemoratives', value: 'commemoratives' },
  { label: 'Bullion', value: 'bullion' },
  { label: 'Proof & Mint Sets', value: 'proof-mint-sets' },
  { label: 'Colonial & Early American', value: 'colonial' },
]

const COMPOSITIONS = [
  { label: 'All Metals', value: 'all' },
  { label: 'Gold', value: 'gold' },
  { label: 'Silver', value: 'silver' },
  { label: 'Copper / Bronze', value: 'copper' },
  { label: 'Nickel', value: 'nickel' },
  { label: 'Clad', value: 'clad' },
  { label: 'Platinum', value: 'platinum' },
  { label: 'Palladium', value: 'palladium' },
]

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

export function ExploreSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const category = searchParams.get('category') ?? 'all'
  const composition = searchParams.get('composition') ?? 'all'
  const fromYear = searchParams.get('fromYear') ?? ''
  const toYear = searchParams.get('toYear') ?? ''

  const [localFrom, setLocalFrom] = useState(fromYear)
  const [localTo, setLocalTo] = useState(toYear)

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

  const applyYearRange = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (localFrom) params.set('fromYear', localFrom)
    else params.delete('fromYear')
    if (localTo) params.set('toYear', localTo)
    else params.delete('toYear')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const clearAll = () => {
    setLocalFrom('')
    setLocalTo('')
    router.push(pathname)
  }

  const hasActiveFilters = category !== 'all' || composition !== 'all' || fromYear || toYear
  const hasCategoryFilter = category !== 'all'
  const hasCompositionFilter = composition !== 'all'
  const hasDateFilter = !!(fromYear || toYear)

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

      <FilterSection title="Type">
        <div className="space-y-0.5">
          {CATEGORIES.map(c => (
            <FilterLink
              key={c.value}
              label={c.label}
              active={category === c.value}
              onClick={() => updateParam('category', c.value)}
            />
          ))}
        </div>
      </FilterSection>

      <div className="h-px bg-border" />

      <FilterSection title="Metal / Composition">
        <div className="space-y-0.5">
          {COMPOSITIONS.map(c => (
            <FilterLink
              key={c.value}
              label={c.label}
              active={composition === c.value}
              onClick={() => updateParam('composition', c.value)}
            />
          ))}
        </div>
      </FilterSection>

      <div className="h-px bg-border" />

      <FilterSection title="Date Range">
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="From"
              value={localFrom}
              min={1652}
              max={2026}
              onChange={e => setLocalFrom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyYearRange()}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-muted-foreground text-xs flex-none">–</span>
            <input
              type="number"
              placeholder="To"
              value={localTo}
              min={1652}
              max={2026}
              onChange={e => setLocalTo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyYearRange()}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={applyYearRange}
            className="w-full rounded-md bg-foreground text-background text-sm py-1.5 font-medium hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      </FilterSection>
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
          Filters
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

      {/* Desktop sidebar - hover to expand */}
      <aside
        className="hidden lg:block flex-none sticky top-8 self-start overflow-hidden"
        style={{
          width: expanded ? '208px' : '36px',
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Collapsed icon rail */}
        <div
          className="absolute inset-0 flex flex-col gap-3 items-center pt-0.5"
          style={{
            opacity: expanded ? 0 : 1,
            transition: 'opacity 150ms ease',
            pointerEvents: expanded ? 'none' : 'auto',
          }}
        >
          <div className={`relative w-8 h-8 flex items-center justify-center rounded-lg ${hasCategoryFilter ? 'text-foreground' : 'text-muted-foreground'}`}>
            <Tag className="h-[17px] w-[17px]" />
            {hasCategoryFilter && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </div>
          <div className={`relative w-8 h-8 flex items-center justify-center rounded-lg ${hasCompositionFilter ? 'text-foreground' : 'text-muted-foreground'}`}>
            <Gem className="h-[17px] w-[17px]" />
            {hasCompositionFilter && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </div>
          <div className={`relative w-8 h-8 flex items-center justify-center rounded-lg ${hasDateFilter ? 'text-foreground' : 'text-muted-foreground'}`}>
            <CalendarDays className="h-[17px] w-[17px]" />
            {hasDateFilter && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </div>
        </div>

        {/* Expanded content */}
        <div
          className="w-[208px]"
          style={{
            opacity: expanded ? 1 : 0,
            transition: 'opacity 200ms ease 100ms',
            pointerEvents: expanded ? 'auto' : 'none',
          }}
        >
          {sidebarContent}
        </div>
      </aside>
    </>
  )
}
