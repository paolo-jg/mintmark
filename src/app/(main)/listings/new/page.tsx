'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GRADING_SERVICES, getVerificationBadgeLabel } from '@/lib/grading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle2, AlertCircle, ImagePlus, X, Coins } from 'lucide-react'
import { toast } from 'sonner'
import type { GradingService, CoinGrade, ListingType } from '@/types'
import { CoinSelector, type PickedCoin } from '@/app/(main)/collect/_components/coin-selector'
import { COIN_CATALOG } from '@/lib/coins/catalog'

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

export default function NewListingPage() {
  const router = useRouter()
  const supabase = createClient()

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: coin picker
  const [pickedCoin, setPickedCoin] = useState<PickedCoin | null>(null)
  const [showCoinPicker, setShowCoinPicker] = useState(false)

  // Step 2: grading
  const [service, setService] = useState<GradingService>('PCGS')
  const [certNumber, setCertNumber] = useState('')
  const [coinGrade, setCoinGrade] = useState<Partial<CoinGrade> | null>(null)
  const [cacDesignation, setCacDesignation] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [mismatchError, setMismatchError] = useState<string | null>(null)

  // Step 3: listing details
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listingType, setListingType] = useState<ListingType>('fixed')
  const [price, setPrice] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [auctionDays, setAuctionDays] = useState('7')

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length + newFiles.length > 8) {
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

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return []
    const client = createClient()
    const urls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await client.storage
        .from('listing-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      const { data: { publicUrl } } = client.storage
        .from('listing-images')
        .getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
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
        if (grade.coinName && !title) {
          setTitle(grade.coinName)
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
    setCacDesignation(false)
    setMismatchError(null)
  }

  const handleCoinPicked = (coin: PickedCoin) => {
    setPickedCoin(coin)
    setTitle(coin.coinName)
    resetStep2()
  }

  const handleServiceChange = (v: string | null) => {
    if (v) {
      setService(v as GradingService)
      setCoinGrade(null)
      setCertNumber('')
      setMismatchError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pickedCoin) {
      toast.error('Select a coin first')
      return
    }
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (listingType === 'fixed' && !price) {
      toast.error('Price is required')
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be signed in')
      setSubmitting(false)
      return
    }

    let imageUrls: string[] = []
    if (imageFiles.length > 0) {
      setUploadingImages(true)
      try {
        imageUrls = await uploadImages()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Image upload failed')
        setSubmitting(false)
        setUploadingImages(false)
        return
      }
      setUploadingImages(false)
    }

    // Step 1: create collection_item via /api/collection
    const collectionPayload = {
      type: 'owned',
      status: 'for_sale',
      coin_name: title,
      year: pickedCoin.year,
      mint_mark: pickedCoin.mintMark,
      grading_service: service !== 'Ungraded' ? service : null,
      grade: coinGrade?.grade ?? null,
      cert_number: certNumber.trim() || null,
      pcgs_image_url: pickedCoin.pcgsImageUrl,
      series_slug: pickedCoin.seriesSlug,
      price_row_label: pickedCoin.priceRowLabel,
      coin_profile: pickedCoin.coinProfile,
    }

    let collectionItemId: string | null = null
    try {
      const collRes = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionPayload),
      })
      const collJson = await collRes.json()
      if (collJson.error) {
        toast.error(collJson.error)
        setSubmitting(false)
        return
      }
      collectionItemId = collJson.data?.id ?? null
    } catch {
      toast.error('Failed to create collection item')
      setSubmitting(false)
      return
    }

    // Duplicate cert check
    if (certNumber.trim() && service !== 'Ungraded') {
      const { data: existingListing } = await supabase
        .from('listings')
        .select('id, title')
        .eq('cert_number', certNumber.trim())
        .eq('status', 'active')
        .maybeSingle()
      if (existingListing) {
        toast.error(`This cert number is already used in an active listing: "${existingListing.title}". Each cert number can only be listed once.`)
        setSubmitting(false)
        return
      }
    }

    // Step 2: insert listing
    const listingData = {
      seller_id: user.id,
      title: title.trim(),
      description: description.trim(),
      listing_type: listingType,
      price: listingType === 'fixed' ? Math.round(parseFloat(price) * 100) : null,
      status: 'active',
      grading_service: service !== 'Ungraded' ? service : null,
      cert_number: certNumber.trim() || null,
      grade: coinGrade?.grade ?? null,
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
      collection_item_id: collectionItemId,
    }

    const { data: listing, error } = await supabase
      .from('listings')
      .insert(listingData)
      .select()
      .single()

    if (error || !listing) {
      toast.error(error?.message ?? 'Failed to create listing')
      setSubmitting(false)
      return
    }

    if (listingType === 'auction') {
      const endTime = new Date()
      endTime.setDate(endTime.getDate() + parseInt(auctionDays))
      const auctionStartPrice = Math.round(parseFloat(startPrice) * 100)
      const { error: auctionError } = await supabase.from('auctions').insert({
        listing_id: listing.id,
        start_price: auctionStartPrice,
        current_bid: auctionStartPrice,
        reserve_price: reservePrice ? Math.round(parseFloat(reservePrice) * 100) : null,
        start_time: new Date().toISOString(),
        end_time: endTime.toISOString(),
      })
      if (auctionError) {
        toast.error('Listing created but auction setup failed')
      }
    }

    toast.success('Listing created!')
    router.push(`/listings/${listing.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-1">List a Coin</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Select the coin you are listing, add grading details, and set your price.
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

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Step 1: Pick Coin ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select a Coin</CardTitle>
              <CardDescription>Browse the catalog to pick the coin you are listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pickedCoin ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-4">
                  {pickedCoin.pcgsImageUrl ? (
                    <img
                      src={pickedCoin.pcgsImageUrl}
                      alt={pickedCoin.coinName}
                      className="h-20 w-20 object-contain mix-blend-multiply flex-shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                      <Coins className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">{pickedCoin.coinName}</p>
                    {pickedCoin.year && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pickedCoin.year}{pickedCoin.mintMark ? `-${pickedCoin.mintMark}` : ''}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{pickedCoin.seriesName}</p>
                    <button
                      type="button"
                      onClick={() => setShowCoinPicker(true)}
                      className="mt-2 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Change Coin
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCoinPicker(true)}
                  className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl py-10 hover:border-foreground/30 hover:bg-muted/30 transition-colors"
                >
                  <Coins className="h-8 w-8 text-muted-foreground/30" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Select a Coin</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Browse the catalog to get started</p>
                  </div>
                </button>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!pickedCoin}
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
              <CardDescription>Enter certification details for this coin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Grading Service</Label>
                <Select value={service} onValueChange={handleServiceChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADING_SERVICES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {service === 'PCGS' && (
                <div className="space-y-1.5">
                  <Label htmlFor="certNumber">Cert Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="certNumber"
                      value={certNumber}
                      onChange={e => setCertNumber(e.target.value)}
                      placeholder="e.g. 12345678"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupCert() } }}
                    />
                    <Button type="button" variant="outline" onClick={lookupCert} disabled={lookingUp || !certNumber.trim()}>
                      {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                  </div>
                </div>
              )}

              {(service === 'NGC' || service === 'ANACS' || service === 'ICG' || service === 'SEGS') && (
                <div className="space-y-1.5">
                  <Label htmlFor="certNumber">Cert Number</Label>
                  <Input
                    id="certNumber"
                    value={certNumber}
                    onChange={e => setCertNumber(e.target.value)}
                    placeholder="e.g. 12345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cert number recorded. Buyers can verify directly on the grading service website.
                  </p>
                </div>
              )}

              {service === 'Ungraded' && (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  This coin will be listed without a grade or certification.
                </div>
              )}

              {/* Mismatch error */}
              {mismatchError && (
                <div className={`rounded-lg border px-4 py-3 flex items-start gap-2.5 ${
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
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {coinGrade.verificationStatus === 'verified'
                      ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : <AlertCircle className="h-4 w-4 text-amber-500" />
                    }
                    <span className={`text-sm font-medium ${coinGrade.verificationStatus === 'verified' ? 'text-green-600' : 'text-amber-500'}`}>
                      {getVerificationBadgeLabel(coinGrade.verificationStatus!)}
                    </span>
                  </div>
                  {coinGrade.coinName && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div><span className="text-muted-foreground">Coin:</span> {coinGrade.coinName}</div>
                      {coinGrade.grade && <div><span className="text-muted-foreground">Grade:</span> {formatGrade(coinGrade.grade)}</div>}
                      {coinGrade.year && <div><span className="text-muted-foreground">Year:</span> {coinGrade.year}</div>}
                      {coinGrade.mintMark && <div><span className="text-muted-foreground">Mint Mark:</span> {coinGrade.mintMark}</div>}
                      {coinGrade.populationAtGrade !== undefined && (
                        <div><span className="text-muted-foreground">Population at grade:</span> {formatPop(coinGrade.populationAtGrade)}</div>
                      )}
                      {coinGrade.populationAbove !== undefined && (
                        <div><span className="text-muted-foreground">Population above:</span> {formatPop(coinGrade.populationAbove)}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CAC designation — hidden for Ungraded */}
              {service !== 'Ungraded' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="cac"
                    checked={cacDesignation}
                    onChange={e => setCacDesignation(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="cac" className="font-normal cursor-pointer">
                    CAC (Certified Acceptance Corporation) sticker present
                  </Label>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => { resetStep2(); setStep(1) }}>Back</Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={
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
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Listing Details ── */}
        {step === 3 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Listing Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. 1881-S Morgan Dollar MS-65"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Add any additional details about the coin's eye appeal, toning, etc."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing &amp; Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Listing Type</Label>
                  <Select value={listingType} onValueChange={v => { if (v) setListingType(v as ListingType) }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="auction">Auction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {listingType === 'fixed' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        id="price"
                        type="number"
                        min="1"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        className="pl-7"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="startPrice">Starting Bid (USD)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="startPrice"
                            type="number"
                            min="1"
                            step="0.01"
                            value={startPrice}
                            onChange={e => setStartPrice(e.target.value)}
                            className="pl-7"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reservePrice">
                          Reserve Price <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            id="reservePrice"
                            type="number"
                            min="1"
                            step="0.01"
                            value={reservePrice}
                            onChange={e => setReservePrice(e.target.value)}
                            className="pl-7"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="auctionDays">Auction Duration</Label>
                      <Select value={auctionDays} onValueChange={v => { if (v) setAuctionDays(v) }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="5">5 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="10">10 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Photos</CardTitle>
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

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                        {i === 0 && (
                          <span className="absolute top-1 left-1 z-10 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                            Cover
                          </span>
                        )}
                        <img src={src} alt="" className="w-full h-full object-cover" />
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

            {/* Legal disclaimer */}
            <div className="rounded-xl border border-border bg-muted/20 px-5 py-4 flex items-start gap-3">
              <input
                type="checkbox"
                id="disclaimer"
                checked={disclaimerAgreed}
                onChange={e => setDisclaimerAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer flex-shrink-0"
              />
              <label htmlFor="disclaimer" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                I confirm that I am the legal owner of this coin and that all information provided is accurate to the best of my knowledge. I accept full legal liability for the authenticity and legitimacy of this listing. Misrepresentation may result in account suspension and legal consequences.
              </label>
            </div>

            <Separator />

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" size="lg" disabled={submitting || !disclaimerAgreed}>
                {uploadingImages
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading photos...</>
                  : submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
                  : 'List Coin'
                }
              </Button>
            </div>
          </>
        )}
      </form>

      {/* Coin picker overlay */}
      {showCoinPicker && (
        <CoinSelector
          mode="pick"
          onClose={() => setShowCoinPicker(false)}
          onAdded={() => setShowCoinPicker(false)}
          onCoinPicked={coin => {
            handleCoinPicked(coin)
            setShowCoinPicker(false)
          }}
        />
      )}
    </div>
  )
}
