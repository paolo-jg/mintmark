'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search, X } from 'lucide-react'

type SeriesFiltersProps = {
  availableServices: string[]
}

export function SeriesFilters({ availableServices }: SeriesFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sort = searchParams.get('sort') ?? 'newest'
  const listingType = searchParams.get('type') ?? 'all'
  const service = searchParams.get('service') ?? 'all'
  const search = searchParams.get('q') ?? ''

  const [searchInput, setSearchInput] = useState(search)

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === 'all' || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParam('q', searchInput.trim())
  }

  function clearSearch() {
    setSearchInput('')
    updateParam('q', null)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by grade, cert, seller..."
          className="w-full h-9 pl-9 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Sort */}
      <select
        value={sort}
        onChange={e => updateParam('sort', e.target.value)}
        className="h-9 px-3 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <option value="newest">Newest Listed</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="year-desc">Year: Newest</option>
        <option value="year-asc">Year: Oldest</option>
      </select>

      {/* Listing Type */}
      <select
        value={listingType}
        onChange={e => updateParam('type', e.target.value)}
        className="h-9 px-3 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <option value="all">All Listings</option>
        <option value="fixed">Buy Now</option>
        <option value="auction">Auction</option>
      </select>

      {/* Grading Service */}
      {availableServices.length > 0 && (
        <select
          value={service}
          onChange={e => updateParam('service', e.target.value)}
          className="h-9 px-3 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
        >
          <option value="all">All Services</option>
          {availableServices.map(svc => (
            <option key={svc} value={svc}>{svc}</option>
          ))}
        </select>
      )}
    </div>
  )
}
