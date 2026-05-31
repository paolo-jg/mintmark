'use client'

import { useState } from 'react'
import { X, Loader2, Search, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { COIN_CATALOG, type CoinCategory, type CoinSeries } from '@/lib/coins/catalog'
import { COIN_DATES } from '@/lib/coins/coin-dates'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const GRADES = [
  'PR70', 'PR69', 'PR68', 'PR67', 'PR66', 'PR65',
  'MS70', 'MS69', 'MS68', 'MS67', 'MS66', 'MS65', 'MS64', 'MS63', 'MS62', 'MS61', 'MS60',
  'AU58', 'AU55', 'AU53', 'AU50',
  'EF45', 'EF40',
  'VF35', 'VF30', 'VF25', 'VF20',
  'F15', 'F12',
  'VG10', 'VG8',
  'G6', 'G4',
  'AG3', 'FR2', 'PO1',
]

const GRADING_SERVICES = ['PCGS', 'NGC', 'ANACS', 'ICG', 'Ungraded']

type Step = 'category' | 'series' | 'details'

export function AddWishlistModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('category')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CoinCategory | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<CoinSeries | null>(null)
  const [selectedCoin, setSelectedCoin] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMintMark, setSelectedMintMark] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [gradingService, setGradingService] = useState('PCGS')
  const [maxPrice, setMaxPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Flatten all series for global search
  const allSeries = COIN_CATALOG.flatMap(cat => cat.series.map(s => ({ ...s, categoryName: cat.name })))

  const filteredCategories = search.trim()
    ? [] // show series results instead when searching
    : COIN_CATALOG

  const filteredSeries = search.trim()
    ? allSeries.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(search.toLowerCase()) ||
        s.dateRange.toLowerCase().includes(search.toLowerCase())
      )
    : selectedCategory?.series ?? []

  const handleCategorySelect = (cat: CoinCategory) => {
    setSelectedCategory(cat)
    setStep('series')
    setSearch('')
  }

  const handleSeriesSelect = (series: CoinSeries) => {
    setSelectedSeries(series)
    const name = series.coinNames.length === 1 ? series.coinNames[0] : ''
    setSelectedCoin(name)
    setSelectedYear('')
    setSelectedMintMark('')
    setStep('details')
    setSearch('')
  }

  const handleSearchSeriesSelect = (series: CoinSeries & { categoryName: string }) => {
    const cat = COIN_CATALOG.find(c => c.name === series.categoryName) ?? null
    setSelectedCategory(cat)
    setSelectedSeries(series)
    const name = series.coinNames.length === 1 ? series.coinNames[0] : ''
    setSelectedCoin(name)
    setSelectedYear('')
    setSelectedMintMark('')
    setStep('details')
    setSearch('')
  }

  const goBack = () => {
    if (step === 'series') { setStep('category'); setSelectedCategory(null); setSearch('') }
    if (step === 'details') { setStep('series'); setSelectedSeries(null); setSelectedCoin(''); setSelectedYear(''); setSelectedMintMark('') }
  }

  // Look up date data for current series
  const dateData = selectedSeries
    ? Object.values(COIN_DATES).find(d => {
        const seriesName = selectedSeries.name.toLowerCase()
        const dataName = d.name.toLowerCase()
        return dataName.includes(seriesName) || seriesName.includes(dataName) ||
          d.slug === selectedSeries.slug
      })
    : null

  const availableYears = dateData?.dates ?? []
  const availableMintMarks = selectedYear
    ? (availableYears.find(d => d.year === parseInt(selectedYear))?.mintMarks ?? [])
    : []

  const save = async () => {
    if (!selectedSeries) return
    const base = selectedCoin || selectedSeries.name
    const yearPart = selectedYear ? ` ${selectedYear}` : ''
    const mintPart = selectedMintMark && selectedMintMark !== 'P' ? `-${selectedMintMark}` : ''
    const coinName = `${base}${yearPart}${mintPart}`.trim()
    setSaving(true)
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'wishlist',
          coin_name: coinName,
          grading_service: gradingService !== 'Ungraded' ? gradingService : null,
          grade: targetGrade || null,
          max_price: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('Added to your wish list')
      onAdded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const title =
    step === 'category' ? 'Add to Wish List' :
    step === 'series' ? (selectedCategory?.name ?? 'Select Series') :
    'Set Target Details'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md border border-border flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'category' && (
              <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors mr-1 text-base leading-none">
                ←
              </button>
            )}
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category step */}
        {step === 'category' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search any series…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-2 py-2">
              {search.trim() ? (
                // Search results - flat series list
                filteredSeries.length > 0 ? filteredSeries.map(series => (
                  <button
                    key={series.slug}
                    onClick={() => handleSearchSeriesSelect(series as CoinSeries & { categoryName: string })}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium">{series.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(series as CoinSeries & { categoryName: string }).categoryName} · {series.dateRange}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground px-4 py-8 text-center">No series found</p>
                )
              ) : (
                // Category list
                filteredCategories.map(cat => (
                  <button
                    key={cat.slug}
                    onClick={() => handleCategorySelect(cat)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.series.length} series</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Series step */}
        {step === 'series' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-2 py-2">
              {selectedCategory?.series.map(series => (
                <button
                  key={series.slug}
                  onClick={() => handleSeriesSelect(series)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{series.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{series.dateRange}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Details step */}
        {step === 'details' && (
          <>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Selected coin summary */}
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">{selectedCategory?.name}</p>
                <p className="text-sm font-semibold">{selectedCoin || selectedSeries?.name}</p>
                {selectedSeries?.dateRange && (
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedSeries.dateRange}</p>
                )}
              </div>

              {/* Year + Mintmark pickers - from scraped date data */}
              {availableYears.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Year <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select value={selectedYear} onValueChange={v => { setSelectedYear(v ?? ''); setSelectedMintMark('') }}>
                      <SelectTrigger><SelectValue placeholder="Any year" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any year</SelectItem>
                        {availableYears.map(d => (
                          <SelectItem key={d.year} value={String(d.year)}>{d.year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mint Mark <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select
                      value={selectedMintMark}
                      onValueChange={v => setSelectedMintMark(v ?? '')}
                      disabled={!selectedYear || availableMintMarks.length === 0}
                    >
                      <SelectTrigger><SelectValue placeholder="Any mint" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any mint</SelectItem>
                        {availableMintMarks.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Coin variant picker - if series has multiple coinNames */}
              {selectedSeries && selectedSeries.coinNames.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Coin Type</Label>
                  <Select value={selectedCoin} onValueChange={v => { if (v) setSelectedCoin(v) }}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {selectedSeries.coinNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Grading service */}
              <div className="space-y-1.5">
                <Label>Grading Service</Label>
                <Select value={gradingService} onValueChange={v => { if (v) setGradingService(v) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADING_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Target grade */}
              <div className="space-y-1.5">
                <Label>
                  Target Grade <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={targetGrade} onValueChange={v => setTargetGrade(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any grade</SelectItem>
                    {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Max price */}
              <div className="space-y-1.5">
                <Label>
                  Max Price <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. CAMEO preferred, original skin"
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2 justify-end flex-shrink-0 border-t border-border pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add to Wish List
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
