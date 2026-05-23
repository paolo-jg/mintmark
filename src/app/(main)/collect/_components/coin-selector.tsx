'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, Search, Loader2, Star, Info, Check, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { COIN_CATALOG, type CoinCategory, type CoinSeries } from '@/lib/coins/catalog'
import { COIN_DATES } from '@/lib/coins/coin-dates'
import { COIN_EDUCATION } from '@/lib/coins/coin-education'

interface Props {
  onClose: () => void
  onAdded: () => void
}

type WizardStep = 'year' | 'mint' | 'grade' | 'service' | 'confirm'

const GRADE_GROUPS = [
  { label: 'Proof', grades: ['PR70', 'PR69', 'PR68', 'PR67', 'PR66', 'PR65', 'PR64', 'PR63', 'PR60'] },
  { label: 'Mint State', grades: ['MS70', 'MS69', 'MS68', 'MS67', 'MS66', 'MS65', 'MS64', 'MS63', 'MS62', 'MS61', 'MS60'] },
  { label: 'About Uncirculated', grades: ['AU58', 'AU55', 'AU53', 'AU50'] },
  { label: 'Extremely Fine', grades: ['EF45', 'EF40'] },
  { label: 'Very Fine', grades: ['VF35', 'VF30', 'VF25', 'VF20'] },
  { label: 'Fine', grades: ['F15', 'F12'] },
  { label: 'Very Good', grades: ['VG10', 'VG8'] },
  { label: 'Good', grades: ['G6', 'G4'] },
  { label: 'Low Grade', grades: ['AG3', 'FR2', 'PO1'] },
]

const MINT_NAMES: Record<string, string> = {
  P: 'Philadelphia', D: 'Denver', S: 'San Francisco',
  O: 'New Orleans', CC: 'Carson City', W: 'West Point',
  C: 'Charlotte', D2: 'Dahlonega', M: 'Manila', H: 'Heaton',
}

const SERVICES = [
  { id: 'PCGS', label: 'PCGS', sub: 'Professional Coin Grading' },
  { id: 'NGC', label: 'NGC', sub: 'Numismatic Guaranty' },
  { id: 'ANACS', label: 'ANACS', sub: 'American Numismatic' },
  { id: 'ICG', label: 'ICG', sub: 'Independent Coin Grading' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

// Maps catalog series slugs to COIN_DATES keys (category/series format)
const CATALOG_TO_DATES: Record<string, string> = {
  // Half Cents
  'liberty-cap-half-cent': 'half-cents/liberty-cap',
  'draped-bust-half-cent': 'half-cents/draped-bust',
  'classic-head-half-cent': 'half-cents/classic-head',
  'braided-hair-half-cent': 'half-cents/braided-hair',
  // Large Cents
  'flowing-hair-cent': 'large-cents/flowing-hair',
  'liberty-cap-cent': 'large-cents/liberty-cap',
  'draped-bust-cent': 'large-cents/draped-bust',
  'classic-head-cent': 'large-cents/classic-head',
  'coronet-matron-head-cent': 'large-cents/coronet-liberty-head',
  'braided-hair-cent': 'large-cents/braided-hair-liberty-head',
  // Small Cents
  'flying-eagle-cent': 'small-cents/flying-eagle-cent',
  'indian-head-cent': 'small-cents/indian-head-cent',
  'lincoln-wheat-cent': 'small-cents/lincoln-wheat-cent',
  'lincoln-memorial-cent': 'small-cents/lincoln-memorial-cent',
  'lincoln-shield-cent': 'small-cents/lincoln-shield-cent',
  // Three Cents
  'three-cent-silver': 'three-cents/silver-three-cent',
  'three-cent-nickel': 'three-cents/nickel-three-cent',
  // Half Dimes
  'flowing-hair-half-dime': 'half-dimes/flowing-hair',
  'draped-bust-half-dime': 'half-dimes/draped-bust',
  'capped-bust-half-dime': 'half-dimes/capped-bust',
  'liberty-seated-half-dime': 'half-dimes/seated-liberty',
  // Nickels
  'shield-nickel': 'nickels/shield',
  'liberty-head-nickel': 'nickels/liberty',
  'buffalo-nickel': 'nickels/buffalo',
  'jefferson-nickel': 'nickels/jefferson',
  'westward-journey-nickel': 'nickels/jefferson',
  'jefferson-nickel-return': 'nickels/jefferson',
  // Dimes
  'draped-bust-dime': 'dimes/draped-bust',
  'capped-bust-dime': 'dimes/capped-bust',
  'liberty-seated-dime': 'dimes/seated-liberty',
  'barber-dime': 'dimes/barber',
  'mercury-dime': 'dimes/mercury',
  'roosevelt-dime': 'dimes/roosevelt',
  // Quarters
  'draped-bust-quarter': 'quarters/draped-bust',
  'capped-bust-quarter': 'quarters/capped-bust',
  'liberty-seated-quarter': 'quarters/seated-liberty',
  'barber-quarter': 'quarters/barber',
  'standing-liberty-quarter': 'quarters/standing-liberty',
  'washington-quarter': 'quarters/washington',
  'statehood-quarters': 'quarters/50-states-and-territories',
  'america-the-beautiful-quarters': 'quarters/america-the-beautiful',
  'american-women-quarters': 'quarters/american-women',
  // Half Dollars
  'flowing-hair-half-dollar': 'half-dollars/flowing-hair',
  'draped-bust-half-dollar': 'half-dollars/draped-bust',
  'capped-bust-half-dollar': 'half-dollars/capped-bust',
  'liberty-seated-half-dollar': 'half-dollars/seated-liberty',
  'barber-half-dollar': 'half-dollars/barber',
  'walking-liberty-half-dollar': 'half-dollars/walking-liberty',
  'franklin-half-dollar': 'half-dollars/franklin',
  'kennedy-half-dollar': 'half-dollars/kennedy',
  // Dollars
  'flowing-hair-dollar': 'dollars/flowing-hair',
  'draped-bust-dollar': 'dollars/draped-bust',
  'gobrecht-dollar': 'dollars/gobrecht',
  'liberty-seated-dollar': 'dollars/seated-liberty',
  'trade-dollar': 'dollars/trade',
  'morgan-dollar': 'dollars/morgan',
  'peace-dollar': 'dollars/peace',
  'eisenhower-dollar': 'dollars/eisenhower',
  'susan-b-anthony-dollar': 'dollars/susan-b-anthony',
  'sacagawea-dollar': 'dollars/native-american-sacagawea',
  'presidential-dollar': 'dollars/presidential',
  'american-innovation-dollar': 'dollars/american-innovation',
  // Gold
  'liberty-head-gold-dollar': 'gold-dollars/liberty-head',
  'small-indian-head-gold-dollar': 'gold-dollars/small-indian-head',
  'large-indian-head-gold-dollar': 'gold-dollars/large-indian-head',
  'turban-head-quarter-eagle': 'gold-2-50-quarter-eagle/turban-head',
  'capped-bust-quarter-eagle': 'gold-2-50-quarter-eagle/capped-bust',
  'classic-head-quarter-eagle': 'gold-2-50-quarter-eagle/classic-head',
  'coronet-head-quarter-eagle': 'gold-2-50-quarter-eagle/coronet-head',
  'indian-head-quarter-eagle': 'gold-2-50-quarter-eagle/indian-head',
  'indian-princess-three-dollar': 'gold-3/indian-princess-head',
  'turban-head-half-eagle': 'gold-5-half-eagle/turban-head',
  'capped-bust-half-eagle': 'gold-5-half-eagle/capped-bust',
  'classic-head-half-eagle': 'gold-5-half-eagle/classic-head',
  'coronet-head-half-eagle': 'gold-5-half-eagle/coronet-head',
  'indian-head-half-eagle': 'gold-5-half-eagle/indian-head',
  'turban-head-eagle': 'gold-10-eagle/turban-head',
  'coronet-head-eagle': 'gold-10-eagle/coronet-head',
  'indian-head-eagle': 'gold-10-eagle/indian-head',
  'coronet-head-double-eagle': 'gold-20-double-eagle/coronet-head',
  'saint-gaudens-double-eagle': 'gold-20-double-eagle/saint-gaudens',
  // Bullion
  'american-silver-eagle': 'bullion-coins/american-silver-eagle',
  'american-gold-eagle': 'bullion-coins/american-gold-eagle',
  'american-platinum-eagle': 'bullion-coins/american-platinum-eagle',
  'american-palladium-eagle': 'bullion-coins/american-palladium-eagle',
  'american-gold-buffalo': 'bullion-coins/gold-american-buffalo',
}

function getDateData(series: CoinSeries) {
  const key = CATALOG_TO_DATES[series.slug]
  if (key && COIN_DATES[key]) return COIN_DATES[key]
  // Fallback: fuzzy match by name
  return Object.values(COIN_DATES).find(d =>
    series.name.toLowerCase() === d.name.toLowerCase()
  ) ?? null
}

function getEducation(series: CoinSeries) {
  return COIN_EDUCATION[series.slug] ?? null
}

// Flatten all series for search
const ALL_SERIES = COIN_CATALOG.flatMap(cat =>
  cat.series.map(s => ({ ...s, categoryName: cat.name, categorySlug: cat.slug }))
)

// ── Sub-components ────────────────────────────────────────────────────────────

function SpecPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{label}</p>
      <p className="text-[13px] font-medium text-foreground">{value}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoinSelector({ onClose, onAdded }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CoinCategory | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<CoinSeries | null>(null)

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('year')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMintMark, setSelectedMintMark] = useState('')
  const [selectedCoinName, setSelectedCoinName] = useState('')
  const [targetGrade, setTargetGrade] = useState('')
  const [gradingService, setGradingService] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const education = selectedSeries ? getEducation(selectedSeries) : null
  const dateData = selectedSeries ? getDateData(selectedSeries) : null
  const availableYears = dateData?.dates ?? []
  const availableMintMarks = selectedYear
    ? (availableYears.find(d => d.year === parseInt(selectedYear))?.mintMarks ?? [])
    : []

  const searchResults = search.trim()
    ? ALL_SERIES.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(search.toLowerCase()) ||
        s.dateRange.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 12)
    : []

  const handleSeriesSelect = (series: CoinSeries) => {
    setSelectedSeries(series)
    setSelectedYear('')
    setSelectedMintMark('')
    setSelectedCoinName(series.coinNames[0] ?? series.name)
    setTargetGrade('')
    setGradingService('')
    setMaxPrice('')
    setNotes('')
    setWizardStep('year')
    setSearch('')
  }

  const pickYear = (y: string) => {
    setSelectedYear(y)
    setSelectedMintMark('')
    const mints = y ? (availableYears.find(d => d.year === parseInt(y))?.mintMarks ?? []) : []
    setWizardStep(mints.length > 1 ? 'mint' : 'grade')
  }

  const pickMint = (m: string) => {
    setSelectedMintMark(m)
    setWizardStep('grade')
  }

  const pickGrade = (g: string) => {
    setTargetGrade(g)
    setWizardStep(g ? 'service' : 'confirm')
  }

  const pickService = (s: string) => {
    setGradingService(s)
    setWizardStep('confirm')
  }

  const goBack = () => {
    if (wizardStep === 'confirm') { setWizardStep(gradingService || targetGrade ? 'service' : 'grade'); return }
    if (wizardStep === 'service') { setWizardStep('grade'); return }
    if (wizardStep === 'grade') {
      const mints = selectedYear ? (availableYears.find(d => d.year === parseInt(selectedYear))?.mintMarks ?? []) : []
      setWizardStep(mints.length > 1 ? 'mint' : 'year')
      return
    }
    if (wizardStep === 'mint') { setWizardStep('year'); return }
  }

  const handleCategorySelect = (cat: CoinCategory) => {
    setSelectedCategory(cat)
    setSelectedSeries(null)
    setSearch('')
  }

  const save = async () => {
    if (!selectedSeries) return
    const base = selectedCoinName || selectedSeries.name
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
          grading_service: gradingService || null,
          grade: targetGrade || null,
          max_price: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success(`"${coinName}" added to your wish list`)
      onAdded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Left panel content ───────────────────────────────────────────────────

  const leftPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search any series…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-5">
        {search.trim() ? (
          // Search results
          searchResults.length > 0 ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 pb-2">Results</p>
              {searchResults.map(s => (
                <button
                  key={`${s.categorySlug}-${s.slug}`}
                  onClick={() => handleSeriesSelect(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors mb-0.5 ${
                    selectedSeries?.slug === s.slug
                      ? 'bg-foreground text-background'
                      : 'hover:bg-muted/60'
                  }`}
                >
                  <p className="text-sm font-medium leading-tight">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.categoryName} · {s.dateRange}</p>
                </button>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground px-2 py-8 text-center">No series found</p>
          )
        ) : selectedCategory ? (
          // Series within category
          <>
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All categories
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 pb-2">
              {selectedCategory.name}
            </p>
            {selectedCategory.series.map(s => (
              <button
                key={s.slug}
                onClick={() => handleSeriesSelect(s)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors mb-0.5 ${
                  selectedSeries?.slug === s.slug
                    ? 'bg-foreground text-background'
                    : 'hover:bg-muted/60'
                }`}
              >
                <p className="text-sm font-medium">{s.name}</p>
                <p className={`text-[11px] mt-0.5 ${selectedSeries?.slug === s.slug ? 'text-background/60' : 'text-muted-foreground'}`}>
                  {s.dateRange}
                </p>
              </button>
            ))}
          </>
        ) : (
          // Category list
          COIN_CATALOG.map(cat => (
            <button
              key={cat.slug}
              onClick={() => handleCategorySelect(cat)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors mb-0.5 text-left"
            >
              <div>
                <p className="text-sm font-medium">{cat.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{cat.series.length} series</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  )

  // ── Right panel content ──────────────────────────────────────────────────

  const rightPanel = selectedSeries ? (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Hero - text left, coins right */}
      <div className="flex gap-6 px-8 py-6 border-b border-border bg-muted/30 flex-shrink-0 min-h-[160px]">
        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">
            {COIN_CATALOG.find(c => c.series.some(s => s.slug === selectedSeries.slug))?.name}
            {selectedSeries.denomination ? ` · ${selectedSeries.denomination}` : ''}
          </p>
          <h2 className="text-2xl font-bold tracking-tight leading-tight">{selectedSeries.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{selectedSeries.dateRange}</p>
        </div>

        {/* Coin images */}
        <div className="flex items-center justify-center gap-2 flex-shrink-0">
          {selectedSeries.image ? (
            <>
              <img
                src={selectedSeries.image}
                alt={`${selectedSeries.name} obverse`}
                className="h-40 w-40 object-contain mix-blend-multiply"
              />
              {selectedSeries.imageReverse && !selectedSeries.dualSide && (
                <img
                  src={selectedSeries.imageReverse}
                  alt={`${selectedSeries.name} reverse`}
                  className="h-40 w-40 object-contain mix-blend-multiply"
                />
              )}
            </>
          ) : (
            <div className="h-40 w-40 rounded-full bg-muted/60 border border-border flex items-center justify-center">
              <Star className="h-14 w-14 text-muted-foreground/20" />
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 space-y-7 flex-1">
        {/* Educational description */}
        {education?.description && (
          <div>
            <p className="text-[13px] leading-relaxed text-foreground/80">{education.description}</p>
          </div>
        )}

        {/* Specs grid */}
        {education && (education.designer || education.composition || education.diameter || education.weight) && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Specifications</p>
            <div className="grid grid-cols-2 gap-2">
              {education.designer && <SpecPill label="Designer" value={education.designer} />}
              {education.composition && <SpecPill label="Composition" value={education.composition} />}
              {education.diameter && <SpecPill label="Diameter" value={education.diameter} />}
              {education.weight && <SpecPill label="Weight" value={education.weight} />}
            </div>
          </div>
        )}

        {/* Key dates */}
        {education?.keyDates && education.keyDates.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Key Dates</p>
            <div className="space-y-1.5">
              {education.keyDates.map(kd => (
                <div key={kd} className="flex items-start gap-2 text-[13px]">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 flex-shrink-0" />
                  <span>{kd}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fun fact */}
        {education?.funFact && (
          <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 flex gap-3">
            <Info className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-muted-foreground leading-relaxed">{education.funFact}</p>
          </div>
        )}

        {/* ── Wizard ── */}
        <div className="border-t border-border pt-6">
          {/* Step breadcrumb */}
          <div className="flex items-center gap-1.5 mb-6">
            {wizardStep !== 'year' && (
              <button onClick={goBack} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mr-1">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            )}
            {(['year', 'mint', 'grade', 'service', 'confirm'] as WizardStep[]).map((s, i) => {
              const steps = availableYears.length > 0 ? ['year', 'mint', 'grade', 'service', 'confirm'] : ['grade', 'service', 'confirm']
              if (!steps.includes(s)) return null
              const idx = steps.indexOf(wizardStep)
              const thisIdx = steps.indexOf(s)
              const done = thisIdx < idx
              const active = s === wizardStep
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${active ? 'bg-foreground' : done ? 'bg-foreground/40' : 'bg-border'}`} />
                </div>
              )
            })}
          </div>

          {/* ── Step: Year ── */}
          {wizardStep === 'year' && (
            <div>
              <p className="text-lg font-semibold mb-1">What year?</p>
              <p className="text-[13px] text-muted-foreground mb-4">Select a specific date or leave open.</p>
              <button
                onClick={() => pickYear('')}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/40 transition-all mb-3 flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-medium">Any year</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Open to any date in the series</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
              {availableYears.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {availableYears.map(d => (
                    <button
                      key={d.year}
                      onClick={() => pickYear(String(d.year))}
                      className="px-2 py-2.5 rounded-lg border border-border text-[13px] font-medium hover:border-foreground hover:bg-foreground hover:text-background transition-all text-center"
                    >
                      {d.year}
                    </button>
                  ))}
                </div>
              )}
              {availableYears.length === 0 && (
                <button
                  onClick={() => pickYear('')}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/40 transition-all"
                >
                  <p className="text-sm text-muted-foreground">No date data — skip to grade</p>
                </button>
              )}
            </div>
          )}

          {/* ── Step: Mint ── */}
          {wizardStep === 'mint' && (
            <div>
              <p className="text-lg font-semibold mb-1">Which mint?</p>
              <p className="text-[13px] text-muted-foreground mb-4">{selectedYear} — select a mint mark.</p>
              <button
                onClick={() => pickMint('')}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/40 transition-all mb-3 flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-medium">Any mint</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Open to any mint mark</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
              <div className="grid grid-cols-2 gap-2">
                {availableMintMarks.map(m => (
                  <button
                    key={m}
                    onClick={() => pickMint(m)}
                    className="px-4 py-4 rounded-xl border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-left group"
                  >
                    <p className="text-2xl font-bold tracking-tight mb-0.5">{m}</p>
                    <p className="text-[11px] text-muted-foreground group-hover:text-background/60 transition-colors">{MINT_NAMES[m] ?? 'Mint'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Grade ── */}
          {wizardStep === 'grade' && (
            <div>
              <p className="text-lg font-semibold mb-1">Target grade?</p>
              <p className="text-[13px] text-muted-foreground mb-4">Pick the minimum grade you're hunting for.</p>
              <button
                onClick={() => pickGrade('')}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/40 transition-all mb-4 flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-medium">Any grade</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Skip to finish</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {GRADE_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.grades.map(g => (
                        <button
                          key={g}
                          onClick={() => pickGrade(g)}
                          className="px-3 py-1.5 rounded-lg border border-border text-[13px] font-medium hover:border-foreground hover:bg-foreground hover:text-background transition-all"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Service ── */}
          {wizardStep === 'service' && (
            <div>
              <p className="text-lg font-semibold mb-1">Grading service?</p>
              <p className="text-[13px] text-muted-foreground mb-4">Who do you want to certify it?</p>
              <button
                onClick={() => pickService('')}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-foreground/30 hover:bg-muted/40 transition-all mb-3 flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-medium">Any / Ungraded</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">No preference on service</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
              </button>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => pickService(s.id)}
                    className="px-4 py-4 rounded-xl border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-left group"
                  >
                    <p className="text-xl font-bold tracking-tight mb-0.5">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground group-hover:text-background/60 transition-colors leading-snug">{s.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {wizardStep === 'confirm' && (
            <div className="space-y-4">
              <p className="text-lg font-semibold mb-1">Confirm details</p>

              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  selectedYear ? { label: 'Year', value: selectedYear } : null,
                  selectedMintMark ? { label: 'Mint', value: selectedMintMark } : null,
                  targetGrade ? { label: 'Grade', value: targetGrade } : null,
                  gradingService ? { label: 'Service', value: gradingService } : null,
                ].filter(Boolean).map(chip => (
                  <div key={chip!.label} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{chip!.label}</span>
                    <span className="text-[13px] font-semibold">{chip!.value}</span>
                  </div>
                ))}
                {!selectedYear && !targetGrade && (
                  <div className="rounded-full border border-border bg-muted/40 px-3 py-1">
                    <span className="text-[13px] text-muted-foreground">Open to any</span>
                  </div>
                )}
              </div>

              {/* Max price */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">Max price <span className="font-normal normal-case tracking-normal">(optional)</span></p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    placeholder="No limit"
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">Notes <span className="font-normal normal-case tracking-normal">(optional)</span></p>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. CAMEO preferred, original skin"
                />
              </div>

              <Button onClick={save} disabled={saving} className="w-full" size="lg">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Add to Wish List
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    // Empty state - no series selected
    <div className="flex flex-col items-center justify-center h-full text-center px-12 text-muted-foreground">
      <Star className="h-12 w-12 mb-4 text-muted-foreground/20" />
      <p className="text-base font-medium mb-2">Select a series</p>
      <p className="text-sm leading-relaxed">
        Browse by category or search for any US coin series to learn about it and add it to your wish list.
      </p>
    </div>
  )

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border flex-shrink-0">
        <h1 className="text-sm font-semibold">Add to Wish List</h1>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      {/* Body - two-panel split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: nav */}
        <div className="w-72 flex-shrink-0 border-r border-border overflow-hidden">
          {leftPanel}
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-hidden">
          {rightPanel}
        </div>
      </div>
    </div>
  )
}
