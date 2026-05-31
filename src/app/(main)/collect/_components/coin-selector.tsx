'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight, Search, Loader2, Star, Info, Check, ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { COIN_CATALOG, type CoinCategory, type CoinSeries } from '@/lib/coins/catalog'
import { COIN_DATES } from '@/lib/coins/coin-dates'
import { COIN_EDUCATION } from '@/lib/coins/coin-education'

export interface PickedCoin {
  seriesName: string
  seriesSlug: string
  coinName: string
  priceRowLabel: string | null
  year: number | null
  mintMark: string | null
  denomination: string | null
  pcgsImageUrl: string | null
  coinProfile: Record<string, unknown> | null
}

interface Props {
  mode?: 'owned' | 'wishlist' | 'pick'
  onClose: () => void
  onAdded: () => void
  onCoinPicked?: (data: PickedCoin) => void
}

type WizardStep = 'coin' | 'grade' | 'service' | 'cert' | 'images' | 'confirm'

interface CoinOption {
  id: string      // e.g. "1893-S" or "1878-P (8 Tail Feathers)"
  year: number
  mint: string
  variety?: string
}

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

function stripEmDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ' ').replace(/—/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

// Known abbreviations that should be fully uppercased in variety text
const ABBREVS = /\b(cc|vdb|cam|dcam|ddr|ddo|rpm|omm|vam|pf|pr)\b/gi

function formatDateLabel(label: string): string {
  // 1. Uppercase the mint mark (letters right after YYYY-)
  let out = label.replace(/^(\d{4}-)([A-Za-z0-9]+)/, (_, yr, mint) => `${yr}${mint.toUpperCase()}`)
  // 2. Title-case + uppercase abbreviations in the variety portion (after ·)
  out = out.replace(/·\s*(.+)$/, (_, variety) => {
    const titled = variety.trim().replace(/\b\w+\b/g, (w: string) =>
      ABBREVS.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    // Reset lastIndex since ABBREVS is a global regex
    ABBREVS.lastIndex = 0
    return `· ${titled}`
  })
  return out
}

// Maps catalog series slugs to COIN_DATES keys (category/series format)
function getDateData(series: CoinSeries) {
  if (COIN_DATES[series.slug]) return COIN_DATES[series.slug]
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
    <div className="py-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-0.5">{label}</p>
      <p className="text-[13px] font-medium text-foreground">{value}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoinSelector({ mode = 'wishlist', onClose, onAdded, onCoinPicked }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CoinCategory | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<CoinSeries | null>(null)

  // Wizard popup state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<WizardStep>('coin')
  const [selectedCoinName, setSelectedCoinName] = useState('')
  const [selectedCoins, setSelectedCoins] = useState<CoinOption[]>([])
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [gradingService, setGradingService] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [coinSearch, setCoinSearch] = useState('')
  const [gradeSearch, setGradeSearch] = useState('')
  const [anyCoinSelected, setAnyCoinSelected] = useState(false)
  const [anyGradeSelected, setAnyGradeSelected] = useState(false)
  // Owned-mode extras
  const [certNumber, setCertNumber] = useState('')
  const [userImages, setUserImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const education = selectedSeries ? getEducation(selectedSeries) : null
  const dateData = selectedSeries ? getDateData(selectedSeries) : null

  const rightPanelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    rightPanelRef.current?.scrollTo({ top: 0 })
  }, [selectedSeries])

  // Preload all coin images for the selected series so they appear instantly in the wizard
  useEffect(() => {
    if (!dateData?.priceRows) return
    dateData.priceRows.forEach(row => {
      if (row.imageUrl) {
        const img = new Image()
        img.src = row.imageUrl
      }
    })
  }, [dateData])

  // Boundary scroll: pause on first hit, chain on the next gesture
  const boundaryState = useRef<'none' | 'paused' | 'ready'>('none')
  const boundaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTableWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return
    const el = e.currentTarget
    const atTop = el.scrollTop === 0 && e.deltaY < 0
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0

    if (!atTop && !atBottom) {
      // Scrolling inside table - clear any pending ready timer and reset
      if (boundaryTimer.current) { clearTimeout(boundaryTimer.current); boundaryTimer.current = null }
      boundaryState.current = 'none'
      return
    }

    if (boundaryState.current === 'none') {
      // First boundary hit - pause and start a ONE-SHOT timer (never reset by momentum)
      boundaryState.current = 'paused'
      boundaryTimer.current = setTimeout(() => {
        boundaryState.current = 'ready'
        boundaryTimer.current = null
      }, 500)
      return
    }

    if (boundaryState.current === 'paused') {
      // Momentum / same gesture still arriving - just absorb, timer is already running
      return
    }

    if (boundaryState.current === 'ready') {
      // New gesture after the pause - chain every event to the parent panel
      let parent = el.parentElement
      while (parent) {
        const oy = window.getComputedStyle(parent).overflowY
        if (oy === 'auto' || oy === 'scroll') {
          parent.scrollBy({ top: e.deltaY })
          break
        }
        parent = parent.parentElement
      }
    }
  }

  // Build coin options from price rows (includes varieties) with year fallback
  const allCoinOptions: CoinOption[] = (() => {
    if (dateData?.priceRows?.length) {
      return dateData.priceRows.map(row => {
        const yearMatch = row.label.match(/^(\d{4})/)
        const mintMatch = row.label.match(/^(\d{4})-([A-Z\d]+)/)
        const varietyMatch = row.label.match(/·\s*(.+)$/)
        return {
          id: row.label,
          year: yearMatch ? parseInt(yearMatch[1]) : 0,
          mint: mintMatch ? mintMatch[2] : 'P',
          variety: varietyMatch ? varietyMatch[1].trim() : undefined,
        }
      })
    }
    // Fallback: dates-only (no price data)
    return (dateData?.dates ?? []).flatMap(d =>
      d.mintMarks.length > 0
        ? d.mintMarks.map(m => ({ id: `${d.year}-${m}`, year: d.year, mint: m }))
        : [{ id: `${d.year}`, year: d.year, mint: '' }]
    )
  })()

  // Chip label: strip year prefix, reconstruct as "MINT · variety" or just mint
  const coinChipLabel = (coin: CoinOption) => {
    const suffix = coin.id.replace(/^\d{4}(-[A-Z\d]+)?/, '').replace(/^\s*·\s*/, '').trim()
    const mintPart = coin.mint && coin.mint !== 'P' ? coin.mint : ''
    return [mintPart, suffix].filter(Boolean).join(' · ') || 'P'
  }

  const filteredCoinOptions = coinSearch.trim()
    ? allCoinOptions.filter(c => c.id.toLowerCase().includes(coinSearch.toLowerCase()))
    : allCoinOptions

  const searchResults = search.trim()
    ? ALL_SERIES.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.categoryName.toLowerCase().includes(search.toLowerCase()) ||
        s.dateRange.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 12)
    : []

  const openWizard = () => {
    setSelectedCoins([])
    setSelectedGrades([])
    setGradingService('')
    setMaxPrice('')
    setNotes('')
    setCoinSearch('')
    setGradeSearch('')
    setAnyCoinSelected(false)
    setAnyGradeSelected(false)
    setCertNumber('')
    setUserImages([])
    setImagePreviews([])
    setWizardStep('coin')
    setWizardOpen(true)
  }

  const closeWizard = () => setWizardOpen(false)

  const handleSeriesSelect = (series: CoinSeries) => {
    setSelectedSeries(series)
    setSelectedCoinName(series.coinNames[0] ?? series.name)
    setWizardOpen(false)
    setSearch('')
  }

  const toggleCoin = (coin: CoinOption) => {
    setAnyCoinSelected(false)
    setSelectedCoins(prev =>
      prev.some(c => c.id === coin.id)
        ? []
        : [coin]
    )
  }

  const toggleGrade = (g: string) => {
    setAnyGradeSelected(false)
    setSelectedGrades(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  const pickService = (s: string) => {
    setGradingService(s)
    setAnyGradeSelected(false)
    setSelectedGrades([])
    if (s) {
      // Service selected - go to grade step
      setWizardStep('grade')
    } else {
      // Ungraded - skip grade and go straight to confirm
      setWizardStep('confirm')
    }
  }

  const goBack = () => {
    if (wizardStep === 'confirm') {
      if (gradingService) {
        // Graded: owned goes back through images, wishlist goes back to grade
        setWizardStep(mode === 'owned' ? 'images' : 'grade'); return
      }
      // Ungraded: always back to service
      setWizardStep('service'); return
    }
    if (wizardStep === 'images') { setWizardStep('cert'); return }
    if (wizardStep === 'cert') { setWizardStep('grade'); return }
    if (wizardStep === 'grade') { setWizardStep('service'); return }
    if (wizardStep === 'service') { setWizardStep('coin'); return }
  }

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 4 - userImages.length)
    const previews = newFiles.map(f => URL.createObjectURL(f))
    setUserImages(prev => [...prev, ...newFiles].slice(0, 4))
    setImagePreviews(prev => [...prev, ...previews].slice(0, 4))
  }

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(imagePreviews[idx])
    setUserImages(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCategorySelect = (cat: CoinCategory) => {
    setSelectedCategory(cat)
    setSelectedSeries(null)
    setSearch('')
  }

  const save = async () => {
    if (!selectedSeries) return
    const base = selectedCoinName || selectedSeries.name
    const coinsToSave = selectedCoins.length > 0 ? selectedCoins : [null]
    const gradesToSave = selectedGrades.length > 0 ? selectedGrades : [null]

    // Build coin profile (shared for both modes)
    const buildProfile = (coin: CoinOption | null) => {
      const priceRow = coin && dateData?.priceRows
        ? (dateData.priceRows.find(r => r.label === coin.id) ?? null)
        : null
      return {
        description: education?.description ? stripEmDashes(education.description) : null,
        specs: {
          designer: education?.designer ?? null,
          composition: education?.composition ?? null,
          diameter: education?.diameter ?? null,
          weight: education?.weight ?? null,
        },
        key_dates: education?.keyDates ?? [],
        price_headers: dateData?.priceHeaders ?? [],
        price_row: priceRow ? { label: priceRow.label, prices: priceRow.prices } : null,
        image_url: priceRow?.imageUrl ?? null,
      }
    }

    const getImageUrl = (coin: CoinOption | null) =>
      coin && dateData?.priceRows
        ? (dateData.priceRows.find(r => r.label === coin.id)?.imageUrl ?? null)
        : null

    // Convert user images to base64 for storage
    const toBase64 = (file: File): Promise<string> =>
      new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })

    setSaving(true)
    let saved = 0
    try {
      const imageDataUrls = mode === 'owned' && userImages.length > 0
        ? await Promise.all(userImages.map(toBase64))
        : []

      for (const coin of coinsToSave) {
        for (const grade of gradesToSave) {
          const yearPart = coin?.year ? ` ${coin.year}` : ''
          const mintPart = coin?.mint && coin.mint !== 'P' ? `-${coin.mint}` : ''
          const varietyPart = coin?.variety ? ` (${coin.variety})` : ''
          const coinName = `${base}${yearPart}${mintPart}${varietyPart}`.trim()
          const profile = buildProfile(coin)

          const imageUrl = getImageUrl(coin)
          const payload =
            mode === 'owned'
              ? {
                  type: 'owned',
                  coin_name: coinName,
                  year: coin?.year ?? null,
                  mint_mark: coin?.mint ?? null,
                  grading_service: gradingService || null,
                  grade: grade || null,
                  cert_number: certNumber.trim() || null,
                  pcgs_image_url: imageUrl,
                  series_slug: selectedSeries.slug,
                  price_row_label: coin?.id ?? null,
                  coin_profile: profile,
                  user_images: imageDataUrls.length > 0 ? imageDataUrls : null,
                  notes: notes.trim() || null,
                }
              : {
                  type: 'wishlist',
                  coin_name: coinName,
                  year: coin?.year ?? null,
                  mint_mark: coin?.mint ?? null,
                  grading_service: gradingService || null,
                  grade: grade || null,
                  max_price: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
                  pcgs_image_url: imageUrl,
                  series_slug: selectedSeries.slug,
                  price_row_label: coin?.id ?? null,
                  coin_profile: profile,
                  notes: notes.trim() || null,
                }

          const res = await fetch('/api/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          const json = await res.json()
          if (json.error) {
            if (mode === 'wishlist' && json.error.includes('unique')) {
              throw new Error(`${coinName} is already on your wish list`)
            }
            throw new Error(json.error)
          }
          saved++
        }
      }
      toast.success(
        mode === 'owned'
          ? `${saved} coin${saved !== 1 ? 's' : ''} added to your collection`
          : `${saved} item${saved !== 1 ? 's' : ''} added to your wish list`
      )
      onAdded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const buildPickedCoin = (coin: CoinOption | null): PickedCoin => {
    if (!selectedSeries) throw new Error('No series selected')
    const base = selectedCoinName || selectedSeries.name
    const priceRow = coin && dateData?.priceRows
      ? (dateData.priceRows.find(r => r.label === coin.id) ?? null)
      : null
    const education = selectedSeries ? getEducation(selectedSeries) : null
    const coinProfile: Record<string, unknown> = {
      description: education?.description ?? null,
      specs: {
        designer: education?.designer ?? null,
        composition: education?.composition ?? null,
        diameter: education?.diameter ?? null,
        weight: education?.weight ?? null,
      },
      key_dates: education?.keyDates ?? [],
      price_headers: dateData?.priceHeaders ?? [],
      price_row: priceRow ? { label: priceRow.label, prices: priceRow.prices } : null,
      image_url: priceRow?.imageUrl ?? null,
    }
    const yearPart = coin?.year ? ` ${coin.year}` : ''
    const mintPart = coin?.mint && coin.mint !== 'P' ? `-${coin.mint}` : ''
    const varietyPart = coin?.variety ? ` (${coin.variety})` : ''
    const coinName = coin ? `${base}${yearPart}${mintPart}${varietyPart}`.trim() : base
    return {
      seriesName: selectedSeries.name,
      seriesSlug: selectedSeries.slug,
      coinName,
      priceRowLabel: coin?.id ?? null,
      year: coin?.year ?? null,
      mintMark: coin?.mint ?? null,
      denomination: selectedSeries.denomination ?? null,
      pcgsImageUrl: priceRow?.imageUrl ?? null,
      coinProfile,
    }
  }

  // ── Left panel content ───────────────────────────────────────────────────

  const leftPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button - above search when inside a category */}
      {selectedCategory && !search.trim() && (
        <div className="px-5 pt-4 pb-1 flex-shrink-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All categories
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
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
      <div className="flex-1 overflow-y-auto overscroll-none px-3 pb-5">
        {search.trim() ? (
          // Search results
          searchResults.length > 0 ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 px-2 pb-2">Results</p>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 px-2 pb-3 pt-1">{selectedCategory.name}</p>
            {selectedCategory.series.map(s => {
              const active = selectedSeries?.slug === s.slug
              return (
                <button
                  key={s.slug}
                  onClick={() => handleSeriesSelect(s)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-colors mb-0.5 flex items-center justify-between group ${
                    active ? 'bg-foreground text-background' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{s.name}</p>
                    <p className={`text-[11px] mt-0.5 ${active ? 'text-background/60' : 'text-muted-foreground'}`}>{s.dateRange}</p>
                  </div>
                  <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ml-2 transition-transform group-hover:translate-x-0.5 ${active ? 'text-background/50' : 'text-muted-foreground/30'}`} />
                </button>
              )
            })}
          </>
        ) : (
          // Category list - styled as prominent cards
          <div className="space-y-1 pt-1">
            {COIN_CATALOG.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategorySelect(cat)}
                className="w-full flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-muted/70 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cat.series.length} series</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── Right panel content ──────────────────────────────────────────────────

  const rightPanel = selectedSeries ? (
    <div ref={rightPanelRef} className="flex flex-col h-full overflow-y-auto overscroll-none">
      {/* Hero - text left, coins right */}
      <div className="flex gap-6 px-8 py-6 border-b border-border bg-muted/30 flex-shrink-0">
        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-1">
            {COIN_CATALOG.find(c => c.series.some(s => s.slug === selectedSeries.slug))?.name}
            {selectedSeries.denomination ? ` · ${selectedSeries.denomination}` : ''}
          </p>
          <h2 className="text-2xl font-bold tracking-tight leading-tight">{selectedSeries.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{selectedSeries.dateRange}</p>
          <button
            onClick={openWizard}
            className="mt-4 self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {mode === 'owned' ? 'Add to Collection' : mode === 'pick' ? 'Select This Coin' : 'Add to Wish List'}
          </button>
        </div>

        {/* Coin images - only shown when image exists */}
        {selectedSeries.image && (
          <div className="flex items-center justify-center gap-2 flex-shrink-0">
            <img
              src={selectedSeries.image}
              alt={`${selectedSeries.name} obverse`}
              className="h-36 w-36 object-contain mix-blend-multiply"
            />
            {selectedSeries.imageReverse && !selectedSeries.dualSide && (
              <img
                src={selectedSeries.imageReverse}
                alt={`${selectedSeries.name} reverse`}
                className="h-36 w-36 object-contain mix-blend-multiply"
              />
            )}
          </div>
        )}
      </div>

      <div className="px-8 py-6 space-y-7 pb-10">
        {/* Educational description - hidden in pick mode */}
        {mode !== 'pick' && education?.description && (
          <div>
            <p className="text-[13px] leading-relaxed text-foreground/80">{stripEmDashes(education.description)}</p>
          </div>
        )}

        {/* Specs grid */}
        {education && (education.designer || education.composition || education.diameter || education.weight) && (
          <div>
            <p className="text-[13px] font-bold uppercase tracking-widest text-foreground mb-3">Specifications</p>
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
            <p className="text-[13px] font-bold uppercase tracking-widest text-foreground mb-3">Key Dates</p>
            <div style={{ columns: education.keyDates.length > 5 ? 2 : 1, columnGap: '2rem' }}>
              {education.keyDates.map(kd => (
                <div key={kd} className="flex items-start gap-2 text-[13px] mb-1.5 break-inside-avoid">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 flex-shrink-0" />
                  <span>{formatDateLabel(kd)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price table */}
        {dateData?.priceHeaders && dateData.priceRows && dateData.priceRows.length > 0 && (
          <div className="rounded-xl border border-border overflow-auto overscroll-none max-h-[480px] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }} onWheel={handleTableWheel}>
            <table className="min-w-max w-full text-[13px] border-separate border-spacing-0">
              <thead>
                <tr>
                  {/* Corner cell: sticky both top and left */}
                  <th
                    className="sticky top-0 left-0 z-20 text-left px-5 py-3 font-semibold text-muted-foreground/70 border-b border-r border-border whitespace-nowrap min-w-[220px]"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    Date
                  </th>
                  {dateData.priceHeaders.map(h => (
                    <th
                      key={h}
                      className="sticky top-0 z-10 px-5 py-3 font-semibold text-muted-foreground/70 border-b border-border whitespace-nowrap text-right min-w-[90px]"
                      style={{ backgroundColor: 'var(--muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dateData.priceRows.map((row, i) => (
                  <tr key={i}>
                    {/* Date cell: sticky left */}
                    <td
                      className="sticky left-0 z-10 px-5 py-3 font-medium whitespace-nowrap border-r border-border"
                      style={{ backgroundColor: i % 2 === 0 ? 'var(--background)' : 'color-mix(in lab, var(--muted) 40%, var(--background) 60%)' }}
                    >
                      {formatDateLabel(row.label)}
                    </td>
                    {row.prices.map((price, j) => (
                      <td
                        key={j}
                        className={`px-5 py-3 text-right font-mono whitespace-nowrap ${price === '-' ? 'text-muted-foreground/30' : 'text-foreground'}`}
                        style={{ backgroundColor: i % 2 === 0 ? 'var(--background)' : 'color-mix(in lab, var(--muted) 40%, var(--background) 60%)' }}
                      >
                        {price}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fun fact - hidden in pick mode */}
        {mode !== 'pick' && education?.funFact && (
          <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 flex gap-3">
            <Info className="h-4 w-4 text-foreground/50 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-muted-foreground leading-relaxed">{stripEmDashes(education.funFact)}</p>
          </div>
        )}

      </div>
    </div>
  ) : (
    // Empty state - no series selected
    <div className="flex flex-col items-center justify-center h-full text-center px-16">
      {/* Stacked coin illustration */}
      <div className="relative mb-8 flex items-center justify-center">
        <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-muted border border-border flex items-center justify-center">
            <Star className="h-7 w-7 text-muted-foreground/20" />
          </div>
        </div>
      </div>
      <p className="text-base font-semibold text-foreground mb-2">Pick a series to explore</p>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
        Browse the categories on the left or search by name to see pricing data, key dates, and specifications.
      </p>
    </div>
  )

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border flex-shrink-0">
        <h1 className="text-sm font-semibold">{mode === 'owned' ? 'Add to Collection' : mode === 'pick' ? 'Select a Coin' : 'Add to Wish List'}</h1>
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

      {/* ── Wizard popup ── */}
      {wizardOpen && selectedSeries && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeWizard}
          />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-2xl bg-background rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-0.5">
                  {selectedSeries.name}
                </p>
                <p className="text-base font-semibold leading-tight">
                  {wizardStep === 'coin' && (mode === 'pick' ? 'Select a date' : 'Select a coin')}
                  {wizardStep === 'grade' && 'Select grade'}
                  {wizardStep === 'service' && 'Grading service'}
                  {wizardStep === 'cert' && 'Cert number'}
                  {wizardStep === 'images' && 'Upload photos'}
                  {wizardStep === 'confirm' && 'Confirm'}
                </p>
              </div>
              <button
                onClick={closeWizard}
                className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress dots + back */}
            <div className="flex items-center gap-2 px-8 py-3 border-b border-border">
              {wizardStep !== 'coin' && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mr-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
              )}
              {(() => {
                const steps: WizardStep[] = gradingService
                  ? mode === 'owned'
                    ? ['coin', 'service', 'grade', 'cert', 'images', 'confirm']
                    : ['coin', 'service', 'grade', 'confirm']
                  : ['coin', 'service', 'confirm']
                const idx = steps.indexOf(wizardStep)
                return steps.map(s => {
                  const thisIdx = steps.indexOf(s)
                  const done = thisIdx < idx
                  const active = s === wizardStep
                  return (
                    <div
                      key={s}
                      className={`h-1.5 rounded-full transition-all ${
                        active ? 'bg-foreground w-4' : done ? 'bg-foreground/30 w-1.5' : 'bg-border w-1.5'
                      }`}
                    />
                  )
                })
              })()}
            </div>

            {/* Step content */}
            <div className="px-8 py-6 flex-1 overflow-y-auto overscroll-none">

              {/* ── Coin selection ── */}
              {wizardStep === 'coin' && (
                <div className="flex flex-col h-full">
                  {mode !== 'pick' && (
                    <p className="text-[13px] text-muted-foreground mb-3">
                      Select a coin, or choose "Any" to match all.
                    </p>
                  )}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                    <input
                      type="text"
                      value={coinSearch}
                      onChange={e => setCoinSearch(e.target.value)}
                      placeholder="Filter by year or mint… e.g. 1893-S"
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-border bg-muted/30 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  <div className="mb-4">
                    {/* Any chip - hidden in pick mode */}
                    {!coinSearch && mode !== 'pick' && (
                      <div className="flex items-start gap-3 py-1.5 border-b border-border mb-2">
                        <button
                          onClick={() => { setAnyCoinSelected(true); setSelectedCoins([]) }}
                          className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all min-w-[4.5rem] text-center ${
                            anyCoinSelected
                              ? 'bg-foreground text-background border-foreground'
                              : 'border-border hover:border-foreground/50'
                          }`}
                        >
                          Any
                        </button>
                      </div>
                    )}
                    {allCoinOptions.length === 0 ? (
                      <p className="text-[13px] text-muted-foreground py-2">No date data for this series.</p>
                    ) : (() => {
                      const byYear = new Map<number, CoinOption[]>()
                      filteredCoinOptions.forEach(coin => {
                        if (!byYear.has(coin.year)) byYear.set(coin.year, [])
                        byYear.get(coin.year)!.push(coin)
                      })
                      return (
                        <div className="space-y-5">
                          {[...byYear.entries()].map(([year, coins]) => (
                            <div key={year}>
                              <p className="text-[11px] font-bold tracking-widest text-muted-foreground/50 uppercase mb-1.5">{year}</p>
                              <div className="space-y-0.5">
                                {coins.map(coin => {
                                  const selected = selectedCoins.some(c => c.id === coin.id)
                                  const mintPart = coin.mint && coin.mint !== 'P' ? coin.mint : 'P'
                                  const priceRow = dateData?.priceRows?.find(r => r.label === coin.id)
                                  const coinImage = priceRow?.imageUrl
                                  return (
                                    <button
                                      key={coin.id}
                                      onClick={() => {
                                        if (mode === 'pick') {
                                          if (onCoinPicked && selectedSeries) {
                                            onCoinPicked(buildPickedCoin(coin))
                                            closeWizard()
                                            onClose()
                                          }
                                        } else {
                                          toggleCoin(coin)
                                        }
                                      }}
                                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                        selected ? 'bg-foreground text-background' : 'hover:bg-muted/60'
                                      }`}
                                    >
                                      <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center">
                                        {coinImage
                                          ? <img src={coinImage} loading="eager" className="h-10 w-10 object-contain mix-blend-multiply" />
                                          : <div className="h-8 w-8 rounded-full bg-muted border border-border" />
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-[13px] font-semibold ${selected ? 'text-background' : 'text-foreground'}`}>
                                          {MINT_NAMES[mintPart] ?? mintPart}
                                        </span>
                                        <span className={`text-[13px] ml-1.5 ${selected ? 'text-background/60' : 'text-muted-foreground'}`}>
                                          ({mintPart})
                                        </span>
                                        {coin.variety && (
                                          <span className={`text-[13px] ml-2 ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>
                                            · {formatDateLabel(`· ${coin.variety}`).replace(/^·\s*/, '')}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ── Grade ── */}
              {wizardStep === 'grade' && (
                <div>
                  <p className="text-[13px] text-muted-foreground mb-3">
                    {mode === 'wishlist'
                      ? `Select target grades for ${gradingService} certified coins.`
                      : `Select the grade for your ${gradingService} coin.`}
                  </p>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                    <input
                      type="text"
                      value={gradeSearch}
                      onChange={e => setGradeSearch(e.target.value)}
                      placeholder="Filter grades… e.g. MS65"
                      className="w-full pl-8 pr-4 py-2 rounded-lg border border-border bg-muted/30 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-4 mb-4">
                    {GRADE_GROUPS
                      .map(group => ({
                        ...group,
                        grades: group.grades.filter(g => !gradeSearch || g.toLowerCase().includes(gradeSearch.toLowerCase())),
                      }))
                      .filter(group => group.grades.length > 0)
                      .map(group => (
                        <div key={group.label}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/50 mb-1.5">{group.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.grades.map(g => {
                              const selected = selectedGrades.includes(g)
                              return (
                                <button
                                  key={g}
                                  onClick={() => toggleGrade(g)}
                                  className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all min-w-[4.5rem] text-center ${
                                    selected
                                      ? 'bg-foreground text-background border-foreground'
                                      : 'border-border hover:border-foreground/50'
                                  }`}
                                >
                                  {g}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Service ── */}
              {wizardStep === 'service' && (
                <div>
                  <p className="text-[13px] text-muted-foreground mb-4">
                    {mode === 'wishlist'
                      ? 'Select the grading service, or choose Ungraded to match ungraded coins.'
                      : 'Select the grading service, or choose Ungraded for an ungraded coin.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => pickService('')}
                      className="px-4 py-4 rounded-xl border border-border hover:border-foreground hover:bg-foreground hover:text-background transition-all text-left group"
                    >
                      <p className="text-xl font-bold tracking-tight mb-0.5">Ungraded</p>
                      <p className="text-[11px] text-muted-foreground group-hover:text-background/60 transition-colors leading-snug">No grading service</p>
                    </button>
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

              {/* ── Cert number (owned mode, after service) ── */}
              {wizardStep === 'cert' && (
                <div>
                  <p className="text-[13px] text-muted-foreground mb-5">
                    Enter your {gradingService} cert number so we can look up your coin's official details. You can skip this if you don't have it handy.
                  </p>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50">Cert Number <span className="font-normal normal-case tracking-normal">(optional)</span></p>
                    <Input
                      value={certNumber}
                      onChange={e => setCertNumber(e.target.value)}
                      placeholder="e.g. 12345678"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* ── Image upload (owned mode) ── */}
              {wizardStep === 'images' && (
                <div>
                  <p className="text-[13px] text-muted-foreground mb-5">
                    Upload photos of your coin. You can add up to 4 images. This step is optional.
                  </p>
                  {/* Preview grid */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 group">
                          <img src={src} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          <button
                            onClick={() => removeImage(i)}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Upload button */}
                  {userImages.length < 4 && (
                    <label className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:border-foreground/40 hover:bg-muted/30 transition-colors">
                      <Plus className="h-6 w-6 text-muted-foreground/40" />
                      <span className="text-[13px] text-muted-foreground">Click to add photos</span>
                      <span className="text-[11px] text-muted-foreground/50">{4 - userImages.length} remaining</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={e => handleImageFiles(e.target.files)}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* ── Confirm ── */}
              {wizardStep === 'confirm' && (
                <div className="space-y-4">
                  {/* Entry count - prominent standalone at top */}
                  {(() => {
                    const count = (selectedCoins.length || 1) * (selectedGrades.length || 1)
                    return (
                      <p className="text-base font-semibold text-foreground">
                        {mode === 'owned'
                          ? `${count} coin${count !== 1 ? 's' : ''} will be added to your collection`
                          : `${count} wish list ${count === 1 ? 'entry' : 'entries'} will be added`
                        }
                      </p>
                    )
                  })()}

                  {/* Summary */}
                  {selectedCoins.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">Coins</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCoins.map(c => (
                          <div key={c.id} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                            <span className="text-[13px] font-semibold">{formatDateLabel(c.id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Service row - always shown */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">Service</p>
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 inline-block">
                      <span className="text-[13px] font-semibold">{gradingService || 'Ungraded'}</span>
                    </div>
                  </div>

                  {/* Grade row - always shown */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">
                      {mode === 'wishlist' ? 'Target Grades' : 'Grade'}
                    </p>
                    {selectedGrades.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedGrades.map(g => (
                          <div key={g} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                            <span className="text-[13px] font-semibold">{g}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 inline-block">
                        <span className="text-[13px] text-muted-foreground">None</span>
                      </div>
                    )}
                  </div>
                  {/* Cert number summary (owned only) */}
                  {mode === 'owned' && certNumber && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">Cert</p>
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 inline-block">
                        <span className="text-[13px] font-semibold">{gradingService} #{certNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* Image count summary (owned only) */}
                  {mode === 'owned' && userImages.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">Photos</p>
                      <div className="flex gap-2">
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="h-12 w-12 rounded-lg overflow-hidden border border-border bg-muted/30">
                            <img src={src} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Max price - wishlist only */}
                  {mode === 'wishlist' && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">Max price <span className="font-normal normal-case tracking-normal">(optional)</span></p>
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
                  )}

                  {/* Notes */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/50 mb-2">Notes <span className="font-normal normal-case tracking-normal">(optional)</span></p>
                    <Input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder={mode === 'owned' ? 'e.g. Bought at Heritage 2024, original roll' : 'e.g. CAMEO preferred, original skin'}
                    />
                  </div>

                </div>
              )}
            </div>

            {/* Sticky footer - action button */}
            {wizardStep !== 'service' && !(mode === 'pick' && wizardStep === 'coin') && (
              <div className="px-8 py-4 border-t border-border">
                {wizardStep === 'coin' && (
                  <Button
                    onClick={() => setWizardStep('service')}
                    className="w-full"
                    disabled={!anyCoinSelected && selectedCoins.length === 0}
                  >
                    Continue
                  </Button>
                )}
                {wizardStep === 'grade' && (
                  <Button
                    onClick={() => setWizardStep(mode === 'owned' ? 'cert' : 'confirm')}
                    className="w-full"
                    disabled={selectedGrades.length === 0}
                  >
                    Continue
                  </Button>
                )}
                {wizardStep === 'cert' && (
                  <Button
                    onClick={() => setWizardStep('images')}
                    className="w-full"
                  >
                    {certNumber.trim() ? 'Continue' : 'Skip'}
                  </Button>
                )}
                {wizardStep === 'images' && (
                  <Button
                    onClick={() => setWizardStep('confirm')}
                    className="w-full"
                  >
                    {userImages.length > 0 ? 'Continue' : 'Skip'}
                  </Button>
                )}
                {wizardStep === 'confirm' && (
                  <Button onClick={save} disabled={saving} className="w-full" size="lg">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {mode === 'owned' ? 'Add to Collection' : 'Add to Wish List'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
