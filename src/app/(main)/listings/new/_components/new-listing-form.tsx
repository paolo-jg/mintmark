'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GRADING_SERVICES, getVerificationBadgeLabel } from '@/lib/grading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle2, AlertCircle, ImagePlus, X, Coins, Tag, Timer, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { GradingService, CoinGrade, ListingType } from '@/types'
import { CoinSelector, type PickedCoin } from '@/app/(main)/collect/_components/coin-selector'
import { COIN_CATALOG } from '@/lib/coins/catalog'
import { StripeConnectGate } from '@/components/stripe/stripe-connect-gate'

function formatGrade(grade: string): string {
  return grade.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2')
}

function formatPop(n: number): string {
  return n.toLocaleString('en-US')
}

function normalizeMint(m: string | null | undefined): string {
  return (!m || m.toUpperCase() === 'P') ? '' : m.toUpperCase()
}

// Reduce catalog and PCGS denomination formats to a common token for comparison
function normalizeDenom(d: string | null | undefined): string | null {
  if (!d) return null
  const s = d.toLowerCase().trim()
  if (['h1c', '1/2c', '½¢', 'half cent'].some(x => s.includes(x))) return 'halfcent'
  if (s === '1c' || s === '1¢' || s.includes('large cent') || s.includes('small cent')) return 'cent'
  if (s === '2c' || s === '2¢') return '2cent'
  if (s === '3c' || s === '3cn' || s === '3cs' || s === '3¢') return '3cent'
  if (s === '5c' || s === '5¢' || s.includes('nickel')) return 'nickel'
  if (s === 'h10c' || s.includes('half dime') || s === '½dime') return 'halfdime'
  if (s === '10c' || s === '10¢' || s.includes('dime')) return 'dime'
  if (s === '20c' || s === '20¢') return '20cent'
  if (s === '25c' || s === '25¢' || s.includes('quarter')) return 'quarter'
  if (s === '50c' || s === '50¢' || s.includes('half dollar')) return 'halfdollar'
  if (s === '$1' || (s.includes('dollar') && !s.includes('double') && !s.includes('half'))) return 'dollar'
  if (s === '$2.50' || s === '$2½' || s.includes('quarter eagle')) return 'quartereаgle'
  if (s === '$3') return '3dollar'
  if (s === '$5' || s.includes('half eagle')) return 'halfeagle'
  if (s === '$10' || (s.includes('eagle') && !s.includes('double') && !s.includes('half'))) return 'eagle'
  if (s === '$20' || s.includes('double eagle')) return 'doubleeagle'
  return s
}

// Stem a word by stripping common suffixes for fuzzy matching
function stem(w: string): string {
  return w.replace(/(?:ies$)/, 'y').replace(/(?:es|s|ing|ed|er|ion)$/, '')
}

// Fuzzy keyword check: any keyword from seriesName appears (with stemming/prefix) in pcgsCoinName
function keywordsMatch(seriesName: string, pcgsCoinName: string): boolean {
  const SKIP = new Set(['the', 'and', 'of', 'in', 'at', 'on', 'by', 'for', 'with', 'a', 'an'])
  const keywords = seriesName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !SKIP.has(w))
  if (keywords.length === 0) return true
  const pcgsWords = pcgsCoinName.toLowerCase().split(/[\s,()./-]+/)
  return keywords.some(kw => {
    const kwStem = stem(kw)
    return pcgsWords.some(pw => {
      const pwStem = stem(pw)
      // exact, stemmed, or one is a prefix of the other (handles "feather"/"feathers")
      return pw === kw || pwStem === kwStem || pw.startsWith(kwStem) || kwStem.startsWith(pwStem)
    })
  })
}

// Parse a catalog dateRange string (e.g. "1878–1921", "1793", "2010–present") into [start, end]
function parseYearRange(dateRange: string): [number, number] {
  const currentYear = new Date().getFullYear()
  const clean = dateRange.replace(/[–—-]/g, '-').trim()
  const parts = clean.split('-').map(p => p.trim())
  const start = parseInt(parts[0])
  if (isNaN(start)) return [0, 0]
  if (parts.length === 1) return [start, start]
  const endStr = parts[parts.length - 1]
  const end = endStr.toLowerCase() === 'present' ? currentYear : parseInt(endStr)
  return [start, isNaN(end) ? start : end]
}

// Get the [start, end] year range for a series slug from COIN_CATALOG
function getSeriesRange(slug: string): [number, number] | null {
  for (const cat of COIN_CATALOG) {
    for (const s of cat.series) {
      if (s.slug === slug) return parseYearRange(s.dateRange)
    }
  }
  return null
}

// Try to identify which catalog series a PCGS coin name belongs to, by keyword matching
// Returns the matched series slug (or null if ambiguous / no match)
function identifyPcgsSeries(pcgsCoinName: string): string | null {
  const SKIP = new Set(['the', 'and', 'of', 'in', 'at', 'on', 'by', 'for', 'with', 'a', 'an'])
  let bestSlug: string | null = null
  let bestScore = 0

  for (const cat of COIN_CATALOG) {
    for (const s of cat.series) {
      const keywords = s.name.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !SKIP.has(w))
      if (keywords.length === 0) continue
      const pcgsWords = pcgsCoinName.toLowerCase().split(/[\s,()./-]+/)
      let score = 0
      for (const kw of keywords) {
        const kwStem = stem(kw)
        if (pcgsWords.some(pw => {
          const pwStem = stem(pw)
          return pw === kw || pwStem === kwStem || pw.startsWith(kwStem) || kwStem.startsWith(pwStem)
        })) {
          score++
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestSlug = s.slug
      }
    }
  }

  return bestScore >= 1 ? bestSlug : null
}

function crossReference(picked: PickedCoin, grade: Partial<CoinGrade>): string | null {
  // 1. Denomination mismatch — always a hard type mismatch
  const pickedDenom = normalizeDenom(picked.denomination)
  const gradeDenom = normalizeDenom(grade.denomination)
  if (pickedDenom && gradeDenom && pickedDenom !== gradeDenom) {
    return `Coin type mismatch: you selected "${picked.seriesName}" (${picked.denomination}) but PCGS returned "${grade.coinName}" (${grade.denomination}).`
  }

  // 2. Keyword mismatch — classify severity using catalog date ranges
  if (grade.coinName && picked.seriesName && !keywordsMatch(picked.seriesName, grade.coinName)) {
    // Look up the selected series range
    const selectedRange = picked.seriesSlug ? getSeriesRange(picked.seriesSlug) : null

    // Identify and look up the PCGS coin's series range
    const pcgsSlug = identifyPcgsSeries(grade.coinName)
    const pcgsRange = pcgsSlug ? getSeriesRange(pcgsSlug) : null

    const pcgsYear = grade.year ?? null

    // The key question: could the PCGS coin's year exist within the selected series?
    // If yes → soft (same denomination, overlapping years — plausible mixup, e.g. 1921 Morgan vs 1921 Peace)
    // If no  → hard (that year provably never belonged to this series, e.g. 1922 Peace vs Morgan 1878–1921)
    const pcgsYearInSelectedSeries = pcgsYear && selectedRange
      ? pcgsYear >= selectedRange[0] && pcgsYear <= selectedRange[1]
      : false

    if (!pcgsYearInSelectedSeries) {
      return `Coin type mismatch: you selected "${picked.seriesName}" but PCGS returned "${grade.coinName}". These appear to be different series.`
    }

    // PCGS year is within the selected series range — soft warning
    const yearNote = pcgsYear && picked.year && pcgsYear === picked.year
      ? ` Both were issued in ${pcgsYear}.`
      : ''
    return `Coin series mismatch: you selected "${picked.seriesName}" but PCGS returned "${grade.coinName}".${yearNote} Verify this is the correct cert before proceeding.`
  }

  // 3. Year mismatch — soft warning
  if (picked.year && grade.year && picked.year !== grade.year) {
    return `Year mismatch: you selected ${picked.year} but PCGS shows ${grade.year}.`
  }

  // 4. Mint mark mismatch — soft warning
  if (normalizeMint(picked.mintMark) !== normalizeMint(grade.mintMark)) {
    const sel = picked.mintMark || 'P'
    const pcgs = grade.mintMark || 'P'
    return `Mint mark mismatch: you selected ${sel} but PCGS shows ${pcgs}.`
  }

  return null
}

// Tier fee configuration
const TIER_FEES: Record<string, { sellPct: number; listingFeeCents: number }> = {
  collector_basic:    { sellPct: 7,   listingFeeCents: 50 },
  collector_premium:  { sellPct: 1.9, listingFeeCents: 40 },
  dealer:             { sellPct: 0,   listingFeeCents: 0  },
}

function calcConvenienceFee(priceUsd: number): number {
  return (priceUsd * 0.029 + 0.30) / (1 - 0.029) + 0.30
}

const FREE_SHIPPING_MIN_CENTS = 25_000 // $250 — below this, minimum $3.99 flat rate required
const FLAT_RATE_MINIMUM_CENTS = 499    // $4.99

// Price input helpers
// Format with commas while preserving partial input (e.g. "1,234." stays as-is)
function formatPriceWhileTyping(v: string): string {
  const stripped = v.replace(/[^0-9.]/g, '')
  const parts = stripped.split('.')
  const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length > 1) return intFormatted + '.' + parts[1].slice(0, 2)
  return intFormatted
}

// On blur, lock to 2 decimal places
function formatPriceInput(raw: string): string {
  const num = parseFloat(raw.replace(/,/g, ''))
  if (!raw || isNaN(num)) return raw
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

function parsePriceCents(v: string): number {
  return Math.round(parseFloat(v.replace(/,/g, '')) * 100)
}

// Live price input handler — formats with commas and restores cursor position
function handlePriceInput(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (v: string) => void
) {
  const input = e.target
  const cursor = input.selectionStart ?? 0
  const oldVal = input.value
  const commasBefore = (oldVal.slice(0, cursor).match(/,/g) ?? []).length
  const digitsBefore = cursor - commasBefore

  const formatted = formatPriceWhileTyping(oldVal)
  setter(formatted)

  // Restore cursor accounting for added/removed commas
  requestAnimationFrame(() => {
    let d = 0, newCursor = 0
    for (let i = 0; i < formatted.length; i++) {
      if (d === digitsBefore) { newCursor = i; break }
      if (formatted[i] !== ',') d++
      newCursor = i + 1
    }
    input.setSelectionRange(newCursor, newCursor)
  })
}

const COIN_GRADES = [
  { group: 'Proof',               grades: ['PR70','PR69','PR68','PR67','PR66','PR65','PR64','PR63','PR62','PR61','PR60'] },
  { group: 'Mint State',          grades: ['MS70','MS69','MS68','MS67','MS66','MS65','MS64','MS63','MS62','MS61','MS60'] },
  { group: 'Specimen',            grades: ['SP67','SP66','SP65','SP64','SP63'] },
  { group: 'Almost Uncirculated', grades: ['AU58','AU55','AU53','AU50'] },
  { group: 'Extremely Fine',      grades: ['EF45','EF40'] },
  { group: 'Very Fine',           grades: ['VF35','VF30','VF25','VF20'] },
  { group: 'Fine',                grades: ['F15','F12'] },
  { group: 'Very Good',           grades: ['VG10','VG8'] },
  { group: 'Good',                grades: ['G6','G4'] },
  { group: 'About Good',          grades: ['AG3'] },
  { group: 'Fair / Poor',         grades: ['FR2','PO1'] },
]

function fmtGrade(g: string) {
  return g.replace(/^(MS|PR|SP|AU|EF|VF|F|VG|G|AG|FR|PO)(\d+)$/, '$1-$2')
}

function GradeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const target = e.target as Node
      if (wrapperRef.current?.contains(target)) return
      const panel = document.getElementById('grade-select-panel')
      if (panel?.contains(target)) return
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    function update() {
      if (wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  function handleFocus() {
    if (wrapperRef.current) setRect(wrapperRef.current.getBoundingClientRect())
    setOpen(true)
    setSearch('')
  }

  function handleSelect(grade: string) {
    onChange(grade)
    setOpen(false)
    setSearch('')
    inputRef.current?.blur()
  }

  const allGrades = COIN_GRADES.flatMap(({ group, grades }) =>
    grades.map(g => ({ group, grade: g, label: fmtGrade(g) }))
  )

  const filtered = search.trim()
    ? allGrades.filter(({ label, group }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        group.toLowerCase().includes(search.toLowerCase())
      )
    : null // null = show grouped view

  return (
    <div ref={wrapperRef} className="relative">
      <div className={`w-full flex items-center rounded-xl border-2 transition-colors ${
        open ? 'border-foreground' : 'border-border'
      }`}>
        <input
          ref={inputRef}
          type="text"
          value={open ? search : (value ? fmtGrade(value) : '')}
          onChange={e => setSearch(e.target.value)}
          onFocus={handleFocus}
          placeholder="Select grade"
          className="flex-1 bg-transparent px-4 py-3 text-sm font-semibold focus:outline-none placeholder:text-muted-foreground placeholder:font-semibold"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (open) { setOpen(false); setSearch('') }
            else { inputRef.current?.focus() }
          }}
          className="pr-4 pl-2 text-muted-foreground"
        >
          <svg
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && rect && createPortal(
        <div
          id="grade-select-panel"
          style={{
            position: 'fixed',
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width,
            zIndex: 9999,
          }}
          className="rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto pb-1">
            {filtered ? (
              filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">No grades found</p>
              ) : (
                filtered.map(({ grade, label }) => (
                  <button
                    key={grade}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); handleSelect(grade) }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                      value === grade ? 'bg-foreground/8 font-semibold text-foreground' : 'text-foreground/80'
                    }`}
                  >
                    {label}
                  </button>
                ))
              )
            ) : (
              COIN_GRADES.map(({ group, grades }) => (
                <div key={group}>
                  <div className="px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50 bg-popover sticky top-0 z-10">
                    {group}
                  </div>
                  {grades.map(g => (
                    <button
                      key={g}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); handleSelect(g) }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                        value === g ? 'bg-foreground/8 font-semibold text-foreground' : 'text-foreground/80'
                      }`}
                    >
                      {fmtGrade(g)}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const BIN_DURATIONS = [
  { value: '1',   label: '24h' },
  { value: '3',   label: '3d'  },
  { value: '7',   label: '7d'  },
  { value: '14',  label: '14d' },
  { value: '30',  label: '30d' },
  { value: 'gtc', label: 'GTC' },
]

export default function NewListingPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  // ID of an existing owned collection item to list for sale (from /collect "List for Sale" button)
  const fromCollectionItemId = searchParams.get('from')
  // ID of an existing draft to resume editing
  const draftId = searchParams.get('draft')

  // Tier config — mirrors sell/page.tsx
  const LISTING_LIMITS: Record<string, number | null> = {
    collector_basic:    10,
    collector_premium:  50,
    dealer:             null,
  }

  // Seller tier for fee preview
  const [sellerTier, setSellerTier] = useState<string>('collector_basic')
  const [listingSlots, setListingSlots] = useState<number | null>(null) // null = unlimited
  const [listingCap, setListingCap] = useState<number | null>(null) // the tier's total monthly cap
  const [listingsUsed, setListingsUsed] = useState<number>(0) // how many created this month

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: coin picker
  const [coinQueue, setCoinQueue] = useState<PickedCoin[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const pickedCoin = coinQueue[queueIndex] ?? null
  const [showCoinPicker, setShowCoinPicker] = useState(false)
  const [changingQueueIdx, setChangingQueueIdx] = useState<number | null>(null)

  // Step 2: grading
  const [service, setService] = useState<GradingService>('PCGS')
  const [certNumber, setCertNumber] = useState('')
  const [coinGrade, setCoinGrade] = useState<Partial<CoinGrade> | null>(null)
  const [manualGrade, setManualGrade] = useState('')
  const [cacDesignation, setCacDesignation] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  // Step 3: listing details
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listingType, setListingType] = useState<ListingType>('fixed')
  const [listingDuration, setListingDuration] = useState('gtc')
  const [price, setPrice] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [auctionDays, setAuctionDays] = useState('7')

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState<boolean | null>(null)

  const [acceptOffers, setAcceptOffers] = useState(false)
  const [minOfferAmount, setMinOfferAmount] = useState('')
  const [autoAcceptPct, setAutoAcceptPct] = useState('')
  const [autoDeclinePct, setAutoDeclinePct] = useState('')
  const [auctionBinPrice, setAuctionBinPrice] = useState('')
  const [passConvenienceFee, setPassConvenienceFee] = useState(false)
  const [returnsPolicy, setReturnsPolicy] = useState<'final_sale' | 'standard' | 'custom'>('final_sale')
  const [standardReturnDays, setStandardReturnDays] = useState('14')
  const [customReturnPolicy, setCustomReturnPolicy] = useState('')
  const [shippingType, setShippingType] = useState<'free' | 'flat'>('free')
  const [shippingPrice, setShippingPrice] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  // Draft resume state
  const [draftListingId, setDraftListingId] = useState<string | null>(null)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])

  // Fetch seller's subscription tier + remaining listing slots
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const userId = data.user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, stripe_onboarding_complete')
        .eq('id', userId)
        .single()
      const tier = profile?.subscription_tier ?? 'collector_basic'
      if (profile?.subscription_tier) setSellerTier(tier)
      setStripeOnboardingComplete(profile?.stripe_onboarding_complete ?? false)

      const limit = LISTING_LIMITS[tier] ?? null
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [{ count: carryOver }, { count: createdThisMonth }] = await Promise.all([
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', userId)
          .eq('status', 'active')
          .lt('created_at', monthStart),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', userId)
          .gte('created_at', monthStart)
          .in('status', ['active', 'sold', 'expired']),
      ])
      const used = (carryOver ?? 0) + (createdThisMonth ?? 0)
      setListingsUsed(used)

      if (limit === null) {
        setListingSlots(null)
        setListingCap(null)
        return
      }
      setListingCap(limit)
      setListingSlots(Math.max(limit - used, 0))
    })
  }, [])

  // Pre-populate form from an existing collection item (when "List for Sale" is clicked in /collect)
  useEffect(() => {
    if (!fromCollectionItemId) return
    supabase
      .from('collection_items')
      .select('*')
      .eq('id', fromCollectionItemId)
      .single()
      .then(({ data: item }) => {
        if (!item) return
        const svc = (item.grading_service as GradingService | null) ?? 'Ungraded'
        const grade = (item.grade as string | null) ?? null
        const prePopCoin: PickedCoin = {
          seriesName: item.series_slug
            ? (item.series_slug as string).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            : (item.coin_name as string),
          seriesSlug: (item.series_slug as string) ?? '',
          coinName: item.coin_name as string,
          priceRowLabel: null,
          denomination: (item.denomination as string | null) ?? null,
          year: (item.year as number | null) ?? null,
          mintMark: (item.mint_mark as string | null) ?? null,
          pcgsImageUrl: (item.pcgs_image_url as string | null) ?? null,
          coinProfile: (item.coin_profile as Record<string, unknown> | null) ?? null,
        }
        setCoinQueue([prePopCoin])
        if (svc !== 'Ungraded') setService(svc)
        if (item.cert_number) setCertNumber(item.cert_number as string)
        if (grade) setManualGrade(grade)
        setTitle(buildTitle(prePopCoin.coinName, svc, grade))
      })
  }, [fromCollectionItemId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-populate form from a saved draft (when "Continue editing" is clicked in /sell)
  useEffect(() => {
    if (!draftId) return
    supabase
      .from('listings')
      .select('*')
      .eq('id', draftId)
      .single()
      .then(({ data: draft }) => {
        if (!draft) return
        setDraftListingId(draft.id as string)

        const svc = (draft.grading_service as GradingService | null) ?? 'Ungraded'
        const prePopCoin: PickedCoin = {
          seriesName: draft.series_slug
            ? (draft.series_slug as string).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            : (draft.coin_name as string),
          seriesSlug: (draft.series_slug as string) ?? '',
          coinName: (draft.coin_name as string) ?? '',
          priceRowLabel: (draft.price_row_label as string | null) ?? null,
          denomination: (draft.denomination as string | null) ?? null,
          year: (draft.year as number | null) ?? null,
          mintMark: (draft.mint_mark as string | null) ?? null,
          pcgsImageUrl: (draft.grading_service_image_url as string | null) ?? null,
          coinProfile: null,
        }
        setCoinQueue([prePopCoin])

        if (svc !== 'Ungraded') setService(svc)
        if (draft.cert_number) setCertNumber(draft.cert_number as string)
        if (draft.grade) setManualGrade(draft.grade as string)
        setCacDesignation((draft.cac_designation as boolean) ?? false)
        if (svc === 'PCGS' && draft.grade) {
          setCoinGrade({
            grade: draft.grade as string,
            coinName: (draft.coin_name as string) ?? '',
            year: (draft.year as number | null) ?? undefined,
            mintMark: (draft.mint_mark as string | null) ?? undefined,
            denomination: (draft.denomination as string | null) ?? undefined,
            populationAtGrade: (draft.population_at_grade as number | null) ?? undefined,
            populationAbove: (draft.population_above as number | null) ?? undefined,
            verificationStatus: ((draft.verification_status as string | null) ?? 'unverified') as import('@/types').VerificationStatus,
            pcgsImageUrl: (draft.grading_service_image_url as string | null) ?? undefined,
          })
        }

        if (draft.title) setTitle(draft.title as string)
        if (draft.description) setDescription(draft.description as string)
        if (draft.listing_type) setListingType(draft.listing_type as ListingType)
        if (draft.price) setPrice(formatPriceWhileTyping(((draft.price as number) / 100).toFixed(2)))
        if (draft.listing_duration_days) setListingDuration(String(draft.listing_duration_days))
        if (draft.shipping_type) setShippingType(draft.shipping_type as 'free' | 'flat')
        if (draft.shipping_price_cents) setShippingPrice(formatPriceWhileTyping(((draft.shipping_price_cents as number) / 100).toFixed(2)))
        if (draft.accept_offers) setAcceptOffers(draft.accept_offers as boolean)
        if (draft.pass_convenience_fee) setPassConvenienceFee(draft.pass_convenience_fee as boolean)
        if ((draft.images as string[] | null)?.length) setExistingImageUrls(draft.images as string[])

        setStep(3)
      })
  }, [draftId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (existingImageUrls.length + imageFiles.length + newFiles.length > 8) {
      toast.error('Maximum 8 images allowed')
      return
    }
    setImageFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file)
      setImagePreviews(prev => [...prev, url])
    })
  }, [imageFiles.length])

  const removeImage = useCallback((index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }, [imagePreviews])

  const removeExistingImage = useCallback((index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index))
  }, [])

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return []
    const client = createClient()
    // Upload all images in parallel
    return Promise.all(imageFiles.map(async (file) => {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await client.storage
        .from('listing-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      return client.storage.from('listing-images').getPublicUrl(path).data.publicUrl
    }))
  }

  const lookupCert = async () => {
    if (!certNumber.trim()) return
    setLookingUp(true)
    setCoinGrade(null)
    setMismatchError(null)
    try {
      const res = await fetch(`/api/cert-lookup?service=${service}&certNumber=${certNumber.trim()}`)
      const data = await res.json()
      if (data.success && data.data) {
        const grade = data.data
        setCoinGrade(grade)
        const baseName = pickedCoin?.coinName ?? grade.coinName ?? ''
        if (baseName) {
          setTitle(buildTitle(baseName, service, grade.grade))
        }
        // Cross-reference against the coin selected in step 1 — warn only, don't block
        if (pickedCoin) {
          setMismatchError(crossReference(pickedCoin, grade))
        }
      } else {
        toast.error(data.error ?? 'Cert not found')
      }
    } catch {
      toast.error('Failed to verify cert')
    } finally {
      setLookingUp(false)
    }
  }

  const resetStep2 = () => {
    setService('PCGS')
    setCertNumber('')
    setCoinGrade(null)
    setManualGrade('')
    setCacDesignation(false)
    setMismatchError(null)
  }

  const resetStep3 = () => {
    setTitle('')
    setDescription('')
    setListingType('fixed')
    setListingDuration('gtc')
    setPrice('')
    setStartPrice('')
    setReservePrice('')
    setAuctionDays('7')
    setImageFiles([])
    setImagePreviews([])
    setAcceptOffers(false)
    setMinOfferAmount('')
    setAutoAcceptPct('')
    setAutoDeclinePct('')
    setAuctionBinPrice('')
    setPassConvenienceFee(false)
    setReturnsPolicy('final_sale')
    setStandardReturnDays('14')
    setCustomReturnPolicy('')

  }

  function buildTitle(coinName: string, svc: GradingService, grade: string | null | undefined): string {
    const parts = [coinName]
    if (svc && svc !== 'Ungraded') parts.push(svc)
    if (grade) parts.push(formatGrade(grade))
    return parts.join(' ')
  }

  const handleCoinPicked = (coin: PickedCoin) => {
    if (changingQueueIdx !== null) {
      // Replace a specific coin in the queue
      setCoinQueue(q => q.map((c, i) => i === changingQueueIdx ? coin : c))
      setChangingQueueIdx(null)
    } else {
      // Add to queue
      setCoinQueue(q => {
        const maxAllowed = listingSlots !== null ? listingSlots : Infinity
        if (q.length >= maxAllowed) {
          toast.error(
            listingSlots === 0
              ? "You've used all your listings for this month. Upgrade your plan to list more."
              : `You only have ${listingSlots} listing${listingSlots === 1 ? '' : 's'} remaining this month.`
          )
          return q
        }
        return [...q, coin]
      })
    }
    setShowCoinPicker(false)
  }

  const removeFromQueue = (idx: number) => {
    setCoinQueue(q => q.filter((_, i) => i !== idx))
  }

  const handleServiceChange = (v: string | null) => {
    if (v) {
      const newService = v as GradingService
      setService(newService)
      setCoinGrade(null)
      setCertNumber('')
      setManualGrade('')
      setMismatchError(null)
      if (pickedCoin) {
        setTitle(buildTitle(pickedCoin.coinName, newService, null))
      }
    }
  }

  const handleManualGradeChange = (g: string) => {
    setManualGrade(g)
    if (pickedCoin) {
      setTitle(buildTitle(pickedCoin.coinName, service, g))
    }
  }

  const saveDraft = async () => {
    if (!pickedCoin) {
      toast.error('Select a coin first')
      return
    }
    setSavingDraft(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('You must be signed in'); setSavingDraft(false); return }

      // Resolve team context — team member saves draft on behalf of dealer
      const { data: membership } = await supabase
        .from('team_members')
        .select('dealer_id')
        .eq('user_id', user.id)
        .maybeSingle()
      const sellerId = membership?.dealer_id ?? user.id

      const draftData = {
        seller_id: sellerId,
        status: 'draft' as const,
        images: existingImageUrls,
        title: title.trim() || pickedCoin.coinName,
        description: description.trim() || null,
        listing_type: listingType,
        price: listingType === 'fixed' && price.trim() ? parsePriceCents(price) : null,
        listing_duration_days: listingType === 'fixed' ? (listingDuration === 'gtc' ? null : parseInt(listingDuration)) : null,
        grading_service: service !== 'Ungraded' ? service : null,
        cert_number: certNumber.trim() || null,
        grade: service === 'PCGS' ? (coinGrade?.grade ?? null) : manualGrade || null,
        verification_status: coinGrade?.verificationStatus ?? 'unverified',
        cac_designation: cacDesignation,
        coin_name: coinGrade?.coinName ?? pickedCoin.coinName,
        year: coinGrade?.year ?? pickedCoin.year,
        mint_mark: coinGrade?.mintMark ?? pickedCoin.mintMark,
        denomination: coinGrade?.denomination ?? pickedCoin.denomination,
        population_at_grade: coinGrade?.populationAtGrade,
        population_above: coinGrade?.populationAbove,
        grading_service_image_url: coinGrade?.pcgsImageUrl ?? pickedCoin.pcgsImageUrl,
        series_slug: pickedCoin.seriesSlug,
        price_row_label: pickedCoin.priceRowLabel,
        pass_convenience_fee: passConvenienceFee,
        accept_offers: acceptOffers,
        min_offer_amount: acceptOffers && minOfferAmount ? parsePriceCents(minOfferAmount) : null,
        auction_bin_price: listingType === 'auction' && auctionBinPrice ? parsePriceCents(auctionBinPrice) : null,
        returns_accepted: false,
        returns_policy_type: returnsPolicy === 'final_sale' ? null : returnsPolicy,
        returns_policy_days: returnsPolicy === 'standard' ? parseInt(standardReturnDays) : null,
        returns_policy_custom: returnsPolicy === 'custom' ? customReturnPolicy.trim() || null : null,
        shipping_type: shippingType,
        shipping_price_cents: shippingType === 'flat' && shippingPrice ? parsePriceCents(shippingPrice) : null,
      }

      const { error } = draftListingId
        ? await supabase.from('listings').update(draftData).eq('id', draftListingId)
        : await supabase.from('listings').insert(draftData)
      if (error) { toast.error(error.message); setSavingDraft(false); return }

      toast.success('Draft saved')
      router.push('/sell?tab=draft')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save draft')
      setSavingDraft(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pickedCoin) {
      toast.error('Select a coin first')
      return
    }
    if (listingSlots !== null && listingSlots <= 0) {
      toast.error("You've used all your listings for this month. Upgrade your plan to list more.")
      return
    }
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    if (imageFiles.length === 0 && existingImageUrls.length === 0) {
      toast.error('Add at least one photo')
      return
    }
    if (listingType === 'fixed' && !price.trim()) {
      toast.error('Ask price is required for Buy It Now listings')
      return
    }
    if (shippingType === 'flat') {
      const shippingCents = shippingPrice ? parsePriceCents(shippingPrice) : 0
      if (shippingCents < FLAT_RATE_MINIMUM_CENTS) {
        toast.error('Minimum shipping rate is $4.99')
        return
      }
    }
    if (shippingType === 'free') {
      const refCents = listingType === 'fixed' && price
        ? parsePriceCents(price)
        : listingType === 'auction' && reservePrice
          ? parsePriceCents(reservePrice)
          : 0
      if (refCents < FREE_SHIPPING_MIN_CENTS) {
        toast.error('Free shipping requires a price or reserve of $250 or more')
        setShippingType('flat')
        return
      }
    }
    if (listingType === 'auction' && !startPrice.trim()) {
      toast.error('Starting bid is required for auction listings')
      return
    }
    if (listingType === 'auction') {
      if (!reservePrice.trim()) {
        toast.error('Reserve price is required for auction listings')
        return
      }
      const startCents = parsePriceCents(startPrice)
      const reserveCents = parsePriceCents(reservePrice)
      if (reserveCents < startCents) {
        toast.error('Reserve price must be greater than or equal to the starting bid')
        return
      }
      if (auctionBinPrice.trim()) {
        const binCents = parsePriceCents(auctionBinPrice)
        if (binCents < reserveCents) {
          toast.error('Buy It Now price must be greater than or equal to the reserve price')
          return
        }
      }
    }
    if (acceptOffers && listingType === 'fixed' && autoAcceptPct && price) {
      const acceptAmt = parsePriceCents(autoAcceptPct)
      const askAmt = parsePriceCents(price)
      if (acceptAmt > askAmt) {
        toast.error('Auto-accept amount cannot exceed the asking price')
        return
      }
    }
    if (acceptOffers && autoAcceptPct && autoDeclinePct) {
      if (parsePriceCents(autoDeclinePct) >= parsePriceCents(autoAcceptPct)) {
        toast.error('Auto-decline amount must be less than the auto-accept amount')
        return
      }
    }

    setSubmitting(true)
    try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be signed in')
      setSubmitting(false)
      return
    }

    // Resolve seller: team members list on behalf of their dealer
    const { data: membership } = await supabase
      .from('team_members')
      .select('dealer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const sellerId = membership?.dealer_id ?? user.id

    setUploadingImages(imageFiles.length > 0)

    // Run image upload and cert check in parallel — don't block on collection item creation
    const certCheckPromise = (certNumber.trim() && service !== 'Ungraded')
      ? supabase.from('listings').select('id, title').eq('cert_number', certNumber.trim()).eq('status', 'active').maybeSingle()
      : Promise.resolve({ data: null })

    let imageUrls: string[] = []

    try {
      const [uploadedUrls, { data: existingListing }] = await Promise.all([
        uploadImages(),
        certCheckPromise,
      ])

      setUploadingImages(false)

      if (existingListing) {
        toast.error(`Cert #${certNumber.trim()} is already used in an active listing: "${existingListing.title}".`)
        setSubmitting(false)
        return
      }

      imageUrls = [...existingImageUrls, ...uploadedUrls]
    } catch (err) {
      setUploadingImages(false)
      toast.error(err instanceof Error ? err.message : 'Failed to prepare listing')
      setSubmitting(false)
      return
    }

    // Collection item handling:
    // • If listing is created from an existing owned collection item → link it directly
    //   and flip its status to for_sale after the listing is created.
    // • Otherwise → create a new collection item in the background and back-fill the FK.
    const isFromCollection = Boolean(fromCollectionItemId)
    let collectionPromise: Promise<{ data?: { id: string } } | null>
    if (!isFromCollection) {
      const collectionPayload = {
        type: 'owned',
        status: 'for_sale',
        coin_name: title,
        year: pickedCoin.year,
        mint_mark: pickedCoin.mintMark,
        grading_service: service !== 'Ungraded' ? service : null,
        grade: service === 'PCGS' ? (coinGrade?.grade ?? null) : manualGrade || null,
        cert_number: certNumber.trim() || null,
        pcgs_image_url: pickedCoin.pcgsImageUrl,
        series_slug: pickedCoin.seriesSlug,
        price_row_label: pickedCoin.priceRowLabel,
        coin_profile: pickedCoin.coinProfile,
      }
      collectionPromise = fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionPayload),
      }).then(r => r.json()).catch(() => null)
    } else {
      collectionPromise = Promise.resolve({ data: { id: fromCollectionItemId! } })
    }

    // Step 2: insert listing
    const listingData = {
      seller_id: sellerId,
      title: title.trim(),
      description: description.trim(),
      listing_type: listingType,
      price: listingType === 'fixed' ? parsePriceCents(price) : null,
      listing_duration_days: listingType === 'fixed' ? (listingDuration === 'gtc' ? null : parseInt(listingDuration)) : null,
      status: 'active',
      grading_service: service !== 'Ungraded' ? service : null,
      cert_number: certNumber.trim() || null,
      grade: service === 'PCGS' ? (coinGrade?.grade ?? null) : manualGrade || null,
      verification_status: coinGrade?.verificationStatus ?? 'unverified',
      cac_designation: cacDesignation,
      coin_name: coinGrade?.coinName ?? pickedCoin.coinName,
      year: coinGrade?.year ?? pickedCoin.year,
      mint_mark: coinGrade?.mintMark ?? pickedCoin.mintMark,
      denomination: coinGrade?.denomination ?? pickedCoin.denomination,
      population_at_grade: coinGrade?.populationAtGrade,
      population_above: coinGrade?.populationAbove,
      grading_service_image_url: coinGrade?.pcgsImageUrl ?? pickedCoin.pcgsImageUrl,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      series_slug: pickedCoin.seriesSlug,
      price_row_label: pickedCoin.priceRowLabel,
      collection_item_id: isFromCollection ? fromCollectionItemId : null, // back-filled async when not from collection
      pass_convenience_fee: passConvenienceFee,
      accept_offers: acceptOffers,
      min_offer_amount: acceptOffers && minOfferAmount ? parsePriceCents(minOfferAmount) : null,
      auto_accept_pct: acceptOffers && autoAcceptPct ? parsePriceCents(autoAcceptPct) : null,
      auto_decline_pct: acceptOffers && autoDeclinePct ? parsePriceCents(autoDeclinePct) : null,
      auction_bin_price: listingType === 'auction' && auctionBinPrice ? parsePriceCents(auctionBinPrice) : null,
      returns_accepted: returnsPolicy !== 'final_sale',
      returns_policy_type: returnsPolicy === 'final_sale' ? null : returnsPolicy,
      returns_policy_days: returnsPolicy === 'standard' ? parseInt(standardReturnDays) : null,
      returns_policy_custom: returnsPolicy === 'custom' ? customReturnPolicy.trim() || null : null,
      shipping_type: shippingType,
      shipping_price_cents: shippingType === 'flat' && shippingPrice ? parsePriceCents(shippingPrice) : null,
    }

    const { data: listing, error } = draftListingId
      ? await supabase.from('listings').update(listingData).eq('id', draftListingId).select().single()
      : await supabase.from('listings').insert(listingData).select().single()

    if (error || !listing) {
      toast.error(error?.message ?? 'Failed to create listing')
      setSubmitting(false)
      return
    }

    if (listingType === 'auction') {
      const endTime = new Date()
      endTime.setDate(endTime.getDate() + parseInt(auctionDays))
      const auctionStartPrice = parsePriceCents(startPrice)
      const { error: auctionError } = await supabase.from('auctions').insert({
        listing_id: listing.id,
        start_price: auctionStartPrice,
        current_bid: auctionStartPrice,
        reserve_price: reservePrice ? parsePriceCents(reservePrice) : null,
        start_time: new Date().toISOString(),
        end_time: endTime.toISOString(),
      })
      if (auctionError) {
        toast.error('Listing created but auction setup failed')
      }
    }

    const listingId = listing.id
    if (isFromCollection) {
      // Flip the existing collection item's status to for_sale
      fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fromCollectionItemId, status: 'for_sale' }),
      }).catch(() => null)
    } else {
      // Back-fill collection_item_id once the background POST resolves
      collectionPromise.then(collJson => {
        const collectionItemId = collJson?.data?.id ?? null
        if (collectionItemId) {
          supabase.from('listings').update({ collection_item_id: collectionItemId }).eq('id', listingId).then(() => {})
        }
      })
    }

    if (queueIndex < coinQueue.length - 1) {
      const nextIdx = queueIndex + 1
      setQueueIndex(nextIdx)
      resetStep2()
      resetStep3()
      setTitle(buildTitle(coinQueue[nextIdx].coinName, 'PCGS', null))
      // Update slot counts
      setListingsUsed(u => u + 1)
      setListingSlots(s => s !== null ? Math.max(s - 1, 0) : null)
      setSubmitting(false)
      setStep(2)
      toast.success(`Listing ${queueIndex + 1} of ${coinQueue.length} created! Up next: ${coinQueue[nextIdx].coinName}`)
    } else {
      setListingSlots(s => s !== null ? Math.max(s - 1, 0) : null)
      toast.success(coinQueue.length > 1 ? `All ${coinQueue.length} listings created!` : 'Listing created!')
      router.push('/sell')
    }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
    {stripeOnboardingComplete === false && (
      <StripeConnectGate onBack={() => router.push('/sell')} />
    )}
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">{draftListingId ? 'Edit Draft' : 'List a Coin'}</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {draftListingId ? 'Pick up where you left off — all fields are editable before you publish.' : 'Select the coin you are listing, add grading details, and set your price.'}
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as const).map(n => (
          <div
            key={n}
            className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold border transition-colors ${
              step === n
                ? 'bg-foreground text-background border-foreground'
                : n < step
                ? 'bg-foreground/20 text-foreground border-foreground/20'
                : 'bg-background text-muted-foreground border-border'
            }`}
          >
            {n}
          </div>
        ))}
        <div className="flex-1 h-px bg-border ml-1" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* ── Step 1: Pick Coin ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select a Coin</CardTitle>
              <CardDescription>Browse the catalog to pick the coin you are listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coinQueue.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowCoinPicker(true)}
                  className="w-full flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-4 hover:bg-muted/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Coins className="h-4.5 w-4.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No coin selected</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Browse the catalog to pick a coin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
                    Browse <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ) : (
                <>
                  <div className="space-y-3">
                    {coinQueue.map((coin, idx) => (
                      <div key={idx} className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-4">
                        {coin.pcgsImageUrl ? (
                          <img
                            src={coin.pcgsImageUrl}
                            alt={coin.coinName}
                            className="h-14 w-14 object-contain mix-blend-multiply flex-shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                            <Coins className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold leading-snug">{coin.coinName}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{coin.seriesName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => { setChangingQueueIdx(idx); setShowCoinPicker(true) }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(idx)}
                            className="text-muted-foreground hover:text-foreground p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(listingSlots === null || coinQueue.length < listingSlots) ? (
                    <button type="button" onClick={() => setShowCoinPicker(true)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mt-2">
                      <span className="text-base leading-none">+</span> Add another coin
                    </button>
                  ) : (
                    <p className="text-xs text-amber-600 mt-2">
                      You've used all your listings for this month.
                    </p>
                  )}
                </>
              )}
              <div className="flex items-center justify-between mt-2">
                {listingCap !== null ? (
                  <p className="text-xs text-muted-foreground">
                    {listingSlots === 0
                      ? <span className="text-destructive">0 of {listingCap} listings remaining this month</span>
                      : `${listingSlots} of ${listingCap} listings remaining this month`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {listingsUsed} of unlimited listings this month
                  </p>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    setQueueIndex(0)
                    resetStep2()
                    resetStep3()
                    setTitle(buildTitle(coinQueue[0].coinName, 'PCGS', null))
                    setStep(2)
                  }}
                  disabled={coinQueue.length === 0}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Grading ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grading &amp; Certification</CardTitle>
              <CardDescription>
                {coinQueue.length > 1 ? `Coin ${queueIndex + 1} of ${coinQueue.length} — ` : ''}
                {pickedCoin?.coinName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Grading service — pill grid */}
              <div className="space-y-2">
                <Label>Grading Service</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADING_SERVICES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleServiceChange(s.value)}
                      className={`flex items-center justify-center rounded-xl border-2 px-4 py-3 transition-all ${
                        service === s.value
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border hover:border-foreground/30 hover:bg-muted/20'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${service === s.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cert number */}
              {service !== 'Ungraded' && (
                <div className="space-y-2">
                  <Label htmlFor="certNumber">Cert Number</Label>
                  <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                    <input
                      id="certNumber"
                      value={certNumber}
                      onChange={e => setCertNumber(e.target.value)}
                      placeholder="e.g. 12345678"
                      onKeyDown={e => { if (e.key === 'Enter' && service === 'PCGS') { e.preventDefault(); lookupCert() } }}
                      className="flex-1 bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                    {service === 'PCGS' && (
                      <button
                        type="button"
                        onClick={lookupCert}
                        disabled={lookingUp || !certNumber.trim()}
                        className="flex items-center gap-2 px-4 text-sm font-semibold border-l border-border bg-muted/40 hover:bg-muted transition-colors disabled:opacity-40"
                      >
                        {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </button>
                    )}
                  </div>
                  {service !== 'PCGS' && (
                    <p className="text-xs text-muted-foreground">Cert recorded. Buyers can verify on the {service} website.</p>
                  )}
                </div>
              )}

              {/* Manual grade selector — non-PCGS only */}
              {service !== 'PCGS' && service !== 'Ungraded' && (
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <GradeSelect value={manualGrade} onChange={handleManualGradeChange} />
                </div>
              )}

              {service === 'Ungraded' && (
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  This coin will be listed without a grade or certification number.
                </div>
              )}

              {/* Mismatch error */}
              {mismatchError && (
                <div className={`rounded-xl border px-4 py-3 flex items-start gap-2.5 ${
                  mismatchError.startsWith('Coin type')
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20'
                }`}>
                  <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${mismatchError.startsWith('Coin type') ? 'text-destructive' : 'text-amber-600'}`} />
                  <p className={`text-sm ${mismatchError.startsWith('Coin type') ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}`}>{mismatchError}</p>
                </div>
              )}

              {/* PCGS result card */}
              {service === 'PCGS' && coinGrade && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {coinGrade.verificationStatus === 'verified'
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <AlertCircle className="h-4 w-4 text-amber-500" />
                    }
                    <span className={`text-sm font-semibold ${coinGrade.verificationStatus === 'verified' ? 'text-green-600' : 'text-amber-500'}`}>
                      {getVerificationBadgeLabel(coinGrade.verificationStatus!)}
                    </span>
                  </div>
                  {coinGrade.coinName && (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      <div><span className="text-muted-foreground">Coin </span><span className="font-medium">{coinGrade.coinName}</span></div>
                      {coinGrade.grade && <div><span className="text-muted-foreground">Grade </span><span className="font-medium">{formatGrade(coinGrade.grade)}</span></div>}
                      {coinGrade.year && <div><span className="text-muted-foreground">Year </span><span className="font-medium">{coinGrade.year}</span></div>}
                      {coinGrade.mintMark && <div><span className="text-muted-foreground">Mint </span><span className="font-medium">{coinGrade.mintMark}</span></div>}
                      {coinGrade.populationAtGrade !== undefined && (
                        <div><span className="text-muted-foreground">Pop at grade </span><span className="font-medium">{formatPop(coinGrade.populationAtGrade)}</span></div>
                      )}
                      {coinGrade.populationAbove !== undefined && (
                        <div><span className="text-muted-foreground">Pop above </span><span className="font-medium">{formatPop(coinGrade.populationAbove)}</span></div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CAC designation */}
              {service !== 'Ungraded' && (
                <label
                  htmlFor="cac"
                  className={`flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-all ${
                    cacDesignation ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">CAC Designation</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Certified Acceptance Corporation sticker present on slab</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      cacDesignation ? 'bg-foreground border-foreground' : 'bg-muted border-border'
                    }`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
                        cacDesignation ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                  </div>
                  <input type="checkbox" id="cac" checked={cacDesignation} onChange={e => setCacDesignation(e.target.checked)} className="sr-only" />
                </label>
              )}

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => { resetStep2(); setStep(1) }}>Back</Button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={savingDraft}
                    onClick={saveDraft}
                  >
                    {savingDraft
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                      : 'Save as Draft'
                    }
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={
                      savingDraft ||
                      mismatchError?.startsWith('Coin type') ||
                      (service === 'PCGS'
                        ? !coinGrade
                        : service !== 'Ungraded'
                        ? !certNumber.trim()
                        : false)
                    }
                  >
                    {mismatchError && !mismatchError.startsWith('Coin type') ? 'Proceed Anyway' : 'Next'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Listing Details ── */}
        {step === 3 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Listing Details</CardTitle>
                {coinQueue.length > 1 && (
                  <CardDescription>
                    {`Coin ${queueIndex + 1} of ${coinQueue.length} — `}{pickedCoin?.coinName}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. 1881-S Morgan Dollar MS-65"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder=""
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Listing Type ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Listing Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'fixed',   icon: Tag,   label: 'Buy It Now', desc: 'Set a fixed price, sell immediately' },
                      { value: 'auction', icon: Timer, label: 'Auction',    desc: 'Let buyers bid competitively' },
                    ] as const).map(({ value, icon: Icon, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setListingType(value)}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                          listingType === value
                            ? 'border-foreground bg-foreground/5'
                            : 'border-border bg-background hover:border-foreground/30 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${listingType === value ? 'text-foreground' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-semibold ${listingType === value ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Pricing ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {listingType === 'fixed' ? (
                  <div className="space-y-3">
                    {/* Price input */}
                    <div className="space-y-2">
                      <Label htmlFor="price">Asking Price <span className="text-destructive">*</span></Label>
                      <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                        <span className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">
                          USD
                        </span>
                        <input
                          id="price"
                          type="text"
                          inputMode="decimal"
                          value={price}
                          onChange={e => handlePriceInput(e, setPrice)}
                          onBlur={() => setPrice(formatPriceInput(price))}
                          className="flex-1 bg-transparent px-4 py-3 text-lg font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* BIN Duration */}
                    <div className="space-y-2">
                      <Label>Listing Duration</Label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {BIN_DURATIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setListingDuration(value)}
                            className={`rounded-lg border-2 py-2 text-sm font-semibold transition-all ${
                              listingDuration === value
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {listingDuration === 'gtc' && (
                        <p className="text-xs text-muted-foreground">Listing stays active until you manually end it or it sells.</p>
                      )}
                    </div>

                    {/* Fee summary */}
                    {price && parseFloat(price.replace(/,/g, '')) > 0 && (() => {
                      const fees = TIER_FEES[sellerTier] ?? TIER_FEES.collector_basic
                      const priceUsd = parseFloat(price.replace(/,/g, ''))
                      const priceCents = Math.round(priceUsd * 100)
                      const sellFeeCents = Math.round(priceCents * fees.sellPct / 100)
                      const youReceiveCents = priceCents - sellFeeCents - fees.listingFeeCents
                      const convFeeCents = passConvenienceFee ? Math.round(calcConvenienceFee(priceUsd) * 100) : 0
                      const fmt = (cents: number) =>
                        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
                      return (
                        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm space-y-2">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Listing fee</span>
                            <span className="tabular-nums">{fmt(fees.listingFeeCents)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Sell fee ({fees.sellPct}%)</span>
                            <span className="tabular-nums">{fmt(sellFeeCents)}</span>
                          </div>
                          {passConvenienceFee && (
                            <div className="flex justify-between text-muted-foreground">
                              <span>Convenience fee billed to buyer</span>
                              <span className="tabular-nums">+{fmt(convFeeCents)}</span>
                            </div>
                          )}
                          <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
                            <span>You receive</span>
                            <span className="tabular-nums">{fmt(Math.max(youReceiveCents, 0))}</span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Convenience fee toggle — dealers only */}
                    {sellerTier === 'dealer' && (
                      <label
                        htmlFor="convFee"
                        className={`flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-all ${
                          passConvenienceFee ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold">Pass Convenience Fee to Buyer</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Adds a line item to the buyer&apos;s checkout covering card processing fees, so your payout isn&apos;t reduced by Stripe.
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                            passConvenienceFee ? 'bg-foreground border-foreground' : 'bg-muted border-border'
                          }`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
                              passConvenienceFee ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          id="convFee"
                          checked={passConvenienceFee}
                          onChange={e => setPassConvenienceFee(e.target.checked)}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="startPrice">Starting Bid <span className="text-destructive">*</span></Label>
                        <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                          <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                          <input
                            id="startPrice"
                            type="text"
                            inputMode="decimal"
                            value={startPrice}
                            onChange={e => handlePriceInput(e, setStartPrice)}
                            onBlur={() => setStartPrice(formatPriceInput(startPrice))}
                            className="flex-1 bg-transparent px-3 py-3 text-base font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reservePrice">
                          Reserve Price <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                          <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                          <input
                            id="reservePrice"
                            type="text"
                            inputMode="decimal"
                            value={reservePrice}
                            onChange={e => handlePriceInput(e, setReservePrice)}
                            onBlur={() => setReservePrice(formatPriceInput(reservePrice))}
                            className="flex-1 bg-transparent px-3 py-3 text-base font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Must be ≥ starting bid.</p>
                      </div>
                    </div>
                    {/* Auction BIN price */}
                    <div className="space-y-2">
                      <Label htmlFor="auctionBin">
                        Buy It Now Price <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                        <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                        <input
                          id="auctionBin"
                          type="text"
                          inputMode="decimal"
                          value={auctionBinPrice}
                          onChange={e => handlePriceInput(e, setAuctionBinPrice)}
                          onBlur={() => setAuctionBinPrice(formatPriceInput(auctionBinPrice))}
                          className="flex-1 bg-transparent px-3 py-3 text-base font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Optional. Must be ≥ reserve price. Buyer skips the auction at this price.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Auction Duration</Label>
                      <div className="grid grid-cols-8 gap-1.5">
                        {['1', '3', '5', '7', '10', '14', '21', '30'].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setAuctionDays(d)}
                            className={`rounded-lg border-2 py-2 text-sm font-semibold transition-all ${
                              auctionDays === d
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                            }`}
                          >
                            {d === '1' ? '24h' : `${d}d`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* ── Accept Offers ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Offers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label
                  htmlFor="acceptOffers"
                  className={`flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-all ${
                    acceptOffers ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">Accept Offers</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Buyers can submit offers below your asking price. You can accept, decline, or counter.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      acceptOffers ? 'bg-foreground border-foreground' : 'bg-muted border-border'
                    }`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
                        acceptOffers ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="acceptOffers"
                    checked={acceptOffers}
                    onChange={e => setAcceptOffers(e.target.checked)}
                    className="sr-only"
                  />
                </label>

                {/* Offer settings — visible when Accept Offers is on */}
                {acceptOffers && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                    {/* Minimum offer */}
                    <div className="space-y-2">
                      <Label htmlFor="minOffer">
                        Minimum Offer <span className="text-muted-foreground font-normal">(optional)</span>
                      </Label>
                      <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                        <span className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                        <input
                          id="minOffer"
                          type="text"
                          inputMode="decimal"
                          value={minOfferAmount}
                          onChange={e => handlePriceInput(e, setMinOfferAmount)}
                          onBlur={() => setMinOfferAmount(formatPriceInput(minOfferAmount))}
                          className="flex-1 bg-transparent px-4 py-3 text-lg font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Offers below this amount will be automatically declined.</p>
                    </div>

                    {/* Auto thresholds */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="autoAccept">Auto-accept at or above</Label>
                        <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                          <span className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                          <input
                            id="autoAccept"
                            type="text"
                            inputMode="decimal"
                            value={autoAcceptPct}
                            onChange={e => handlePriceInput(e, setAutoAcceptPct)}
                            onBlur={() => setAutoAcceptPct(formatPriceInput(autoAcceptPct))}
                            className="flex-1 bg-transparent px-4 py-3 text-lg font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        {(() => {
                          const acceptAmt = autoAcceptPct ? parsePriceCents(autoAcceptPct) : 0
                          const askAmt = price ? parsePriceCents(price) : 0
                          const overAsk = listingType === 'fixed' && acceptAmt > 0 && askAmt > 0 && acceptAmt > askAmt
                          return overAsk
                            ? <p className="text-xs text-destructive">Must be less than or equal to the asking price</p>
                            : <p className="text-xs text-muted-foreground">Automatically accept offers at or above this amount.</p>
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="autoDecline">Auto-decline below</Label>
                        <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                          <span className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                          <input
                            id="autoDecline"
                            type="text"
                            inputMode="decimal"
                            value={autoDeclinePct}
                            onChange={e => handlePriceInput(e, setAutoDeclinePct)}
                            onBlur={() => setAutoDeclinePct(formatPriceInput(autoDeclinePct))}
                            className="flex-1 bg-transparent px-4 py-3 text-lg font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                        {(() => {
                          const declineAmt = autoDeclinePct ? parsePriceCents(autoDeclinePct) : 0
                          const acceptAmt = autoAcceptPct ? parsePriceCents(autoAcceptPct) : 0
                          const invalid = declineAmt > 0 && acceptAmt > 0 && declineAmt >= acceptAmt
                          return invalid
                            ? <p className="text-xs text-destructive">Must be less than auto-accept amount</p>
                            : <p className="text-xs text-muted-foreground">Automatically decline offers below this amount.</p>
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shipping</CardTitle>
                <CardDescription>How much will the buyer pay for shipping?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const priceCents = listingType === 'fixed' && price
                    ? parsePriceCents(price)
                    : listingType === 'auction' && reservePrice
                      ? parsePriceCents(reservePrice)
                      : 0
                  const freeAllowed = priceCents >= FREE_SHIPPING_MIN_CENTS
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => { if (freeAllowed) setShippingType('free') }}
                          disabled={!freeAllowed}
                          className={`flex flex-col items-start rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                            !freeAllowed
                              ? 'border-border opacity-40 cursor-not-allowed'
                              : shippingType === 'free'
                                ? 'border-foreground bg-foreground/5'
                                : 'border-border hover:border-foreground/30'
                          }`}
                        >
                          <span className={`text-sm font-semibold ${shippingType === 'free' && freeAllowed ? 'text-foreground' : 'text-muted-foreground'}`}>Free Shipping</span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {freeAllowed ? 'You cover the label cost' : 'Available for listings $250+'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShippingType('flat')}
                          className={`flex flex-col items-start rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                            shippingType === 'flat' ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
                          }`}
                        >
                          <span className={`text-sm font-semibold ${shippingType === 'flat' ? 'text-foreground' : 'text-muted-foreground'}`}>Flat Rate</span>
                          <span className="text-xs text-muted-foreground mt-0.5">Buyer pays a fixed amount</span>
                        </button>
                      </div>

                      {shippingType === 'flat' && (
                        <div className="space-y-2">
                          <Label htmlFor="shippingPrice" className="text-sm font-medium">Shipping Price</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input
                              id="shippingPrice"
                              type="text"
                              inputMode="decimal"
                              value={shippingPrice}
                              onChange={e => handlePriceInput(e, setShippingPrice)}
                              placeholder="4.99"
                              className="h-11 pl-7 text-base"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Minimum $4.99. Added to the buyer&apos;s total at checkout.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Photos <span className="text-destructive text-sm font-normal">*</span></CardTitle>
                <CardDescription>Add up to 8 photos. The first image will be shown as the cover.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault() }}
                  onDrop={e => { e.preventDefault(); handleImageSelect(e.dataTransfer.files) }}
                >
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click or drag photos here</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP up to 8 images</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => handleImageSelect(e.target.files)}
                  />
                </div>

                {(imagePreviews.length > 0 || existingImageUrls.length > 0) && (
                  <div className="grid grid-cols-4 gap-2">
                    {/* Existing uploaded images from saved draft */}
                    {existingImageUrls.map((src, i) => (
                      <div
                        key={`existing-${i}`}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                      >
                        {i === 0 && (
                          <span className="absolute top-1 left-1 z-10 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                            Cover
                          </span>
                        )}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(i)}
                          className="absolute top-1 right-1 z-10 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {/* New images being added */}
                    {imagePreviews.map((src, i) => (
                      <div
                        key={`new-${i}`}
                        draggable
                        onDragStart={() => { dragIndexRef.current = i }}
                        onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={e => {
                          e.preventDefault()
                          const from = dragIndexRef.current
                          if (from === null || from === i) { setDragOverIndex(null); return }
                          const reorder = <T,>(arr: T[]) => {
                            const next = [...arr]
                            const [item] = next.splice(from, 1)
                            next.splice(i, 0, item)
                            return next
                          }
                          setImageFiles(f => reorder(f))
                          setImagePreviews(p => reorder(p))
                          dragIndexRef.current = null
                          setDragOverIndex(null)
                        }}
                        onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null) }}
                        className={`relative aspect-square rounded-lg overflow-hidden border group cursor-grab active:cursor-grabbing transition-all ${
                          dragOverIndex === i ? 'border-foreground ring-2 ring-foreground/20 scale-105' : 'border-border'
                        }`}
                      >
                        {i === 0 && existingImageUrls.length === 0 && (
                          <span className="absolute top-1 left-1 z-10 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                            Cover
                          </span>
                        )}
                        <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 z-10 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={savingDraft || submitting}
                  onClick={saveDraft}
                >
                  {savingDraft
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                    : 'Save as Draft'
                  }
                </Button>
                <div className="flex flex-col items-end gap-1.5">
                  <Button type="submit" size="lg" disabled={submitting || savingDraft}>
                    {uploadingImages
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading photos...</>
                      : submitting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
                      : 'List Coin'
                    }
                  </Button>
                  {submitting && (
                    <p className="text-xs text-muted-foreground">This may take a few seconds…</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </form>

      {/* Coin picker overlay */}
      {showCoinPicker && (
        <CoinSelector
          mode="pick"
          onClose={() => { setShowCoinPicker(false); setChangingQueueIdx(null) }}
          onAdded={() => { setShowCoinPicker(false); setChangingQueueIdx(null) }}
          onCoinPicked={coin => {
            handleCoinPicked(coin)
            setShowCoinPicker(false)
          }}
        />
      )}
    </div>
    </>
  )
}
