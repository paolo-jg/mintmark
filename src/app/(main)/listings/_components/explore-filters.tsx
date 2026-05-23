'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

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
  { label: 'Pattern Coins', value: 'patterns' },
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

function useConstrainedDropdown() {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const toggle = () => {
    if (!buttonRef.current) return setOpen(v => !v)
    const rect = buttonRef.current.getBoundingClientRect()
    const GAP = 6
    const PADDING = 16
    const spaceBelow = window.innerHeight - rect.bottom - GAP - PADDING
    const spaceAbove = rect.top - GAP - PADDING
    if (spaceBelow >= spaceAbove) {
      setPanelStyle({ top: '100%', bottom: 'auto', marginTop: GAP, maxHeight: Math.min(spaceBelow, 288) })
    } else {
      setPanelStyle({ bottom: '100%', top: 'auto', marginBottom: GAP, maxHeight: Math.min(spaceAbove, 288) })
    }
    setOpen(v => !v)
  }

  return { open, setOpen, toggle, panelStyle, buttonRef, containerRef }
}

function Dropdown({
  label,
  activeLabel,
  options,
  onSelect,
  active,
}: {
  label: string
  activeLabel: string
  options: { label: string; value: string }[]
  onSelect: (value: string) => void
  active: boolean
}) {
  const { open, setOpen, toggle, panelStyle, buttonRef, containerRef } = useConstrainedDropdown()

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
          active
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-background text-foreground hover:border-foreground/40'
        }`}
      >
        {active ? activeLabel : label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 bg-background border border-border rounded-xl shadow-xl z-50 py-1 min-w-[200px] overflow-y-auto"
          style={panelStyle}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false) }}
              className={`block w-full text-left text-sm px-3 py-1.5 transition-colors ${
                activeLabel === opt.label
                  ? 'bg-foreground text-background font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DateDropdown({
  fromYear,
  toYear,
  onApply,
  active,
}: {
  fromYear: string
  toYear: string
  onApply: (from: string, to: string) => void
  active: boolean
}) {
  const { open, setOpen, toggle, panelStyle, buttonRef, containerRef } = useConstrainedDropdown()
  const [localFrom, setLocalFrom] = useState(fromYear)
  const [localTo, setLocalTo] = useState(toYear)

  useEffect(() => {
    setLocalFrom(fromYear)
    setLocalTo(toYear)
  }, [fromYear, toYear])

  const label = active
    ? fromYear && toYear ? `${fromYear}–${toYear}` : fromYear ? `From ${fromYear}` : `To ${toYear}`
    : 'Date'

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
          active
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-background text-foreground hover:border-foreground/40'
        }`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 bg-background border border-border rounded-xl shadow-xl z-50 p-4 w-56 overflow-y-auto"
          style={panelStyle}
        >
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-3">
            Year Range
          </p>
          <div className="flex gap-2 items-center mb-3">
            <input
              type="number"
              placeholder="From"
              value={localFrom}
              min={1652}
              max={2026}
              onChange={e => setLocalFrom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (onApply(localFrom, localTo), setOpen(false))}
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
              onKeyDown={e => e.key === 'Enter' && (onApply(localFrom, localTo), setOpen(false))}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => { onApply(localFrom, localTo); setOpen(false) }}
            className="w-full rounded-md bg-foreground text-background text-sm py-1.5 font-medium hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

export function ExploreFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const category = searchParams.get('category') ?? 'all'
  const composition = searchParams.get('composition') ?? 'all'
  const fromYear = searchParams.get('fromYear') ?? ''
  const toYear = searchParams.get('toYear') ?? ''
  const q = searchParams.get('q') ?? ''

  const [localQ, setLocalQ] = useState(q)

  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === 'all') params.delete(key)
        else params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams]
  )

  const handleSearch = (value: string) => {
    setLocalQ(value)
    updateParam({ q: value || null })
  }

  const clearAll = () => {
    setLocalQ('')
    router.push(pathname)
  }

  const hasActiveFilters = category !== 'all' || composition !== 'all' || fromYear || toYear || q

  const categoryLabel = CATEGORIES.find(c => c.value === category)?.label ?? 'All Types'
  const compositionLabel = COMPOSITIONS.find(c => c.value === composition)?.label ?? 'All Metals'

  return (
    <div className="mb-8 space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search coin series, e.g. Morgan Dollar, Buffalo Nickel…"
          value={localQ}
          onChange={e => handleSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
        />
        {localQ && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Dropdown
          label="Type"
          activeLabel={categoryLabel}
          options={CATEGORIES}
          onSelect={v => updateParam({ category: v })}
          active={category !== 'all'}
        />
        <Dropdown
          label="Metal"
          activeLabel={compositionLabel}
          options={COMPOSITIONS}
          onSelect={v => updateParam({ composition: v })}
          active={composition !== 'all'}
        />
        <DateDropdown
          fromYear={fromYear}
          toYear={toYear}
          onApply={(from, to) => updateParam({ fromYear: from || null, toYear: to || null })}
          active={!!(fromYear || toYear)}
        />
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
