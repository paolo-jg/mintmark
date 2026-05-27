'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, ImagePlus, X, Tag, Timer, Lock } from 'lucide-react'
import { toast } from 'sonner'

// ── Constants (mirrors new listing page) ──────────────────────────────────────

const TIER_FEES: Record<string, { sellPct: number; listingFeeCents: number }> = {
  collector_basic:    { sellPct: 7,   listingFeeCents: 50 },
  collector_premium:  { sellPct: 1.9, listingFeeCents: 40 },
  dealer:             { sellPct: 0,   listingFeeCents: 0  },
}

const BIN_DURATIONS = [
  { value: '1',   label: '24h' },
  { value: '3',   label: '3d'  },
  { value: '7',   label: '7d'  },
  { value: '14',  label: '14d' },
  { value: '30',  label: '30d' },
  { value: 'gtc', label: 'GTC' },
]

function calcConvenienceFee(priceUsd: number): number {
  return (priceUsd * 0.029 + 0.30) / (1 - 0.029) + 0.30
}

// ── Price helpers ─────────────────────────────────────────────────────────────

function centsToDisplay(cents: number | null | undefined): string {
  if (!cents) return ''
  const str = (cents / 100).toFixed(2)
  const [int, dec] = str.split('.')
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec
}

function formatPriceWhileTyping(v: string): string {
  const stripped = v.replace(/[^0-9.]/g, '')
  const parts = stripped.split('.')
  const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts.length > 1) return intFormatted + '.' + parts[1].slice(0, 2)
  return intFormatted
}

function formatPriceInput(raw: string): string {
  const num = parseFloat(raw.replace(/,/g, ''))
  if (!raw || isNaN(num)) return raw
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
}

function parsePriceCents(v: string): number {
  return Math.round(parseFloat(v.replace(/,/g, '')) * 100)
}

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

// ── Photo type ────────────────────────────────────────────────────────────────

type PhotoItem =
  | { id: string; type: 'existing'; url: string }
  | { id: string; type: 'new'; file: File; preview: string }

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listing: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auction: Record<string, any> | null
  sellerTier: string
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── Lock notice ──────────────────────────────────────────────────────────────

function LockNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
      <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-700 dark:text-amber-400">{children}</p>
    </div>
  )
}

export function EditForm({ listing, auction, sellerTier }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const listingType: string = listing.listing_type ?? 'fixed'
  const isDraft: boolean = listing.status === 'draft'

  // ── Lock rules ────────────────────────────────────────────────────────────
  // Duration is always locked once the listing is created.
  const durationLocked = true
  // Auction pricing + offers lock when there's at least one bid.
  const hasBidder = listingType === 'auction' && (auction?.bid_count ?? 0) > 0

  // ── Listing details ───────────────────────────────────────────────────────
  const [title, setTitle] = useState<string>(listing.title ?? '')
  const [description, setDescription] = useState<string>(listing.description ?? '')

  // ── Pricing ───────────────────────────────────────────────────────────────
  // BIN
  const [price, setPrice] = useState<string>(centsToDisplay(listing.price))
  const [listingDuration, setListingDuration] = useState<string>(
    listing.listing_duration_days != null
      ? String(listing.listing_duration_days)
      : 'gtc'
  )
  // Auction
  const [startPrice, setStartPrice] = useState<string>(
    centsToDisplay(auction?.start_price ?? listing.start_price)
  )
  const [reservePrice, setReservePrice] = useState<string>(
    centsToDisplay(auction?.reserve_price ?? listing.reserve_price)
  )
  const [auctionBinPrice, setAuctionBinPrice] = useState<string>(
    centsToDisplay(listing.auction_bin_price)
  )

  // ── Convenience fee ───────────────────────────────────────────────────────
  const [passConvenienceFee, setPassConvenienceFee] = useState<boolean>(
    listing.pass_convenience_fee ?? false
  )

  // ── Offers ────────────────────────────────────────────────────────────────
  const [acceptOffers, setAcceptOffers] = useState<boolean>(listing.accept_offers ?? false)
  const [minOfferAmount, setMinOfferAmount] = useState<string>(
    centsToDisplay(listing.min_offer_amount)
  )
  const [autoAcceptPct, setAutoAcceptPct] = useState<string>(
    centsToDisplay(listing.auto_accept_pct)
  )
  const [autoDeclinePct, setAutoDeclinePct] = useState<string>(
    centsToDisplay(listing.auto_decline_pct)
  )

  // ── Returns policy ────────────────────────────────────────────────────────
  type ReturnsPolicy = 'final_sale' | 'standard' | 'custom'
  const initialReturns: ReturnsPolicy = listing.returns_accepted
    ? ((listing.returns_policy_type as ReturnsPolicy) ?? 'standard')
    : 'final_sale'
  const [returnsPolicy, setReturnsPolicy] = useState<ReturnsPolicy>(initialReturns)
  const [standardReturnDays, setStandardReturnDays] = useState<string>(
    listing.returns_policy_days != null ? String(listing.returns_policy_days) : '14'
  )
  const [customReturnPolicy, setCustomReturnPolicy] = useState<string>(
    listing.returns_policy_custom ?? ''
  )

  // ── Photos ────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (listing.images as string[] ?? []).map((url: string, i: number) => ({
      id: `existing-${i}`,
      type: 'existing' as const,
      url,
    }))
  )
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Submit state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // ── Photo handlers ────────────────────────────────────────────────────────

  const handlePhotoSelect = useCallback((files: FileList | null) => {
    if (!files) return
    const remaining = 8 - photos.length
    if (remaining <= 0) { toast.error('Maximum 8 photos allowed'); return }
    const toAdd = Array.from(files).slice(0, remaining)
    const newItems: PhotoItem[] = toAdd.map(file => ({
      id: `new-${Date.now()}-${Math.random()}`,
      type: 'new' as const,
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...newItems])
  }, [photos.length])

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  const reorderPhotos = (fromIdx: number, toIdx: number) => {
    setPhotos(prev => {
      const next = [...prev]
      const [item] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, item)
      return next
    })
  }

  // ── Upload new photos ─────────────────────────────────────────────────────

  const uploadNewPhotos = async (): Promise<string[]> => {
    const newPhotos = photos.filter(p => p.type === 'new') as (PhotoItem & { type: 'new' })[]
    if (newPhotos.length === 0) return []
    return Promise.all(newPhotos.map(async ({ file }) => {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('listing-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      return supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl
    }))
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (requirePhotos = true): boolean => {
    if (!title.trim()) { toast.error('Title is required'); return false }
    if (requirePhotos && photos.length === 0) { toast.error('At least one photo is required'); return false }

    if (listingType === 'fixed') {
      if (!price || parsePriceCents(price) <= 0) {
        toast.error('Asking price is required'); return false
      }
    } else {
      if (!startPrice || parsePriceCents(startPrice) <= 0) {
        toast.error('Starting bid is required'); return false
      }
    }

    if (acceptOffers && listingType === 'fixed' && autoAcceptPct && price) {
      if (parsePriceCents(autoAcceptPct) > parsePriceCents(price)) {
        toast.error('Auto-accept amount cannot exceed the asking price'); return false
      }
    }
    if (acceptOffers && autoAcceptPct && autoDeclinePct) {
      if (parsePriceCents(autoDeclinePct) >= parsePriceCents(autoAcceptPct)) {
        toast.error('Auto-decline amount must be less than the auto-accept amount'); return false
      }
    }

    return true
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (!validate(true)) return
    if (photos.length === 0) { toast.error('Add at least one photo before publishing'); return }
    setPublishing(true)
    try {
      let uploadedUrls: string[] = []
      try { uploadedUrls = await uploadNewPhotos() } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload photos')
        setPublishing(false); return
      }
      let uploadIdx = 0
      const finalImages = photos.map(p => p.type === 'existing' ? p.url : uploadedUrls[uploadIdx++])
      const { error } = await supabase.from('listings').update({ status: 'active', images: finalImages }).eq('id', listing.id)
      if (error) { toast.error(error.message); setPublishing(false); return }
      toast.success('Listing published!')
      router.push(`/listings/${listing.id}`)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
      setPublishing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(isDraft ? false : true)) return
    setSubmitting(true)

    try {
      // 1. Upload any new photos
      let uploadedUrls: string[] = []
      try {
        uploadedUrls = await uploadNewPhotos()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload photos')
        setSubmitting(false)
        return
      }

      // 2. Build final images array preserving order
      let uploadIdx = 0
      const finalImages = photos.map(p => {
        if (p.type === 'existing') return p.url
        return uploadedUrls[uploadIdx++]
      })

      // 3. Build listing update payload
      const listingUpdate: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        images: finalImages,
        returns_accepted: returnsPolicy !== 'final_sale',
        returns_policy_type: returnsPolicy === 'final_sale' ? null : returnsPolicy,
        returns_policy_days: returnsPolicy === 'standard' ? parseInt(standardReturnDays) : null,
        returns_policy_custom: returnsPolicy === 'custom' ? customReturnPolicy.trim() || null : null,
      }

      // Offers — only update when no bidder has locked them
      if (!hasBidder) {
        listingUpdate.accept_offers = acceptOffers
        listingUpdate.min_offer_amount = acceptOffers && minOfferAmount ? parsePriceCents(minOfferAmount) : null
        listingUpdate.auto_accept_pct = acceptOffers && autoAcceptPct ? parsePriceCents(autoAcceptPct) : null
        listingUpdate.auto_decline_pct = acceptOffers && autoDeclinePct ? parsePriceCents(autoDeclinePct) : null
      }

      if (listingType === 'fixed') {
        listingUpdate.price = parsePriceCents(price)
        listingUpdate.pass_convenience_fee = passConvenienceFee
        // duration is locked — never written back
      } else if (!hasBidder) {
        // auction without bids — allow BIN price edit
        listingUpdate.auction_bin_price = auctionBinPrice ? parsePriceCents(auctionBinPrice) : null
      }

      const { error: listingErr } = await supabase
        .from('listings')
        .update(listingUpdate)
        .eq('id', listing.id)

      if (listingErr) {
        toast.error(listingErr.message)
        setSubmitting(false)
        return
      }

      // 4. Update auction row — only when no bidder
      if (listingType === 'auction' && auction && !hasBidder) {
        const { error: auctionErr } = await supabase
          .from('auctions')
          .update({
            start_price: parsePriceCents(startPrice),
            reserve_price: reservePrice ? parsePriceCents(reservePrice) : null,
          })
          .eq('id', auction.id)

        if (auctionErr) {
          toast.error('Listing updated, but auction prices could not be saved')
          setSubmitting(false)
          return
        }
      }

      toast.success(isDraft ? 'Draft saved' : 'Listing updated')
      router.push(isDraft ? '/sell?tab=draft' : `/listings/${listing.id}`)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fees = TIER_FEES[sellerTier] ?? TIER_FEES.collector_basic
  const priceUsd = price ? parseFloat(price.replace(/,/g, '')) : 0

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">

      {isDraft && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          This listing is a <strong>draft</strong> — it won&apos;t be visible to buyers until you publish it. Add photos and complete any missing fields, then click <strong>Publish Listing</strong>.
        </div>
      )}

      {/* ── Listing Details ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Coin meta — read-only */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Coin</span>
              <span className="font-medium text-right">{listing.coin_name ?? '—'}</span>
            </div>
            {listing.grading_service && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Grading service</span>
                <span className="font-medium text-right">{listing.grading_service}</span>
              </div>
            )}
            {listing.grade && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Grade</span>
                <span className="font-medium text-right">
                  {listing.grade.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2')}
                </span>
              </div>
            )}
            {listing.cert_number && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Cert #</span>
                <span className="font-medium text-right tabular-nums">{listing.cert_number}</span>
              </div>
            )}
          </div>

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
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Listing Type (read-only) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listing Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'fixed',   icon: Tag,   label: 'Buy It Now', desc: 'Set a fixed price, sell immediately' },
              { value: 'auction', icon: Timer,  label: 'Auction',    desc: 'Let buyers bid competitively' },
            ] as const).map(({ value, icon: Icon, label, desc }) => (
              <div
                key={value}
                className={`flex flex-col items-start gap-1.5 rounded-xl border-2 px-4 py-3.5 ${
                  listingType === value
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border bg-background opacity-40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${listingType === value ? 'text-foreground' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-semibold ${listingType === value ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Listing type cannot be changed after creation.</p>
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
              <div className="space-y-2">
                <Label htmlFor="price">Asking Price <span className="text-destructive">*</span></Label>
                <div className="flex items-stretch rounded-xl border-2 border-border focus-within:border-foreground transition-colors overflow-hidden">
                  <span className="flex items-center px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
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

              <div className="space-y-2">
                <Label>Listing Duration</Label>
                {durationLocked ? (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                    <span className="text-sm font-semibold">
                      {listingDuration === 'gtc'
                        ? 'Good Till Cancelled'
                        : listingDuration === '1'
                        ? '24 hours'
                        : `${listingDuration} days`}
                    </span>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                ) : (
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
                )}
                {durationLocked && (
                  <p className="text-xs text-muted-foreground">Duration cannot be changed once a listing is live.</p>
                )}
              </div>

              {/* Fee summary */}
              {priceUsd > 0 && (() => {
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

              {/* Convenience fee — dealers only */}
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
                      Adds a line item to the buyer&apos;s checkout covering card processing fees.
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
                  <input type="checkbox" id="convFee" checked={passConvenienceFee} onChange={e => setPassConvenienceFee(e.target.checked)} className="sr-only" />
                </label>
              )}
            </div>
          ) : (
            /* Auction pricing */
            <div className="space-y-4">
              {hasBidder && (
                <LockNotice>
                  This auction has active bids. Pricing cannot be changed.
                </LockNotice>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startPrice">Starting Bid <span className="text-destructive">*</span></Label>
                  <div className={`flex items-stretch rounded-xl border-2 overflow-hidden transition-colors ${hasBidder ? 'border-border bg-muted/30' : 'border-border focus-within:border-foreground'}`}>
                    <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                    <input
                      id="startPrice"
                      type="text"
                      inputMode="decimal"
                      value={startPrice}
                      onChange={e => !hasBidder && handlePriceInput(e, setStartPrice)}
                      onBlur={() => !hasBidder && setStartPrice(formatPriceInput(startPrice))}
                      readOnly={hasBidder}
                      className={`flex-1 bg-transparent px-3 py-3 text-base font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none ${hasBidder ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                      placeholder="0.00"
                    />
                    {hasBidder && <span className="flex items-center pr-3"><Lock className="h-3.5 w-3.5 text-muted-foreground/40" /></span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservePrice">
                    Reserve Price <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <div className={`flex items-stretch rounded-xl border-2 overflow-hidden transition-colors ${hasBidder ? 'border-border bg-muted/30' : 'border-border focus-within:border-foreground'}`}>
                    <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                    <input
                      id="reservePrice"
                      type="text"
                      inputMode="decimal"
                      value={reservePrice}
                      onChange={e => !hasBidder && handlePriceInput(e, setReservePrice)}
                      onBlur={() => !hasBidder && setReservePrice(formatPriceInput(reservePrice))}
                      readOnly={hasBidder}
                      className={`flex-1 bg-transparent px-3 py-3 text-base font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none ${hasBidder ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                      placeholder="0.00"
                    />
                    {hasBidder && <span className="flex items-center pr-3"><Lock className="h-3.5 w-3.5 text-muted-foreground/40" /></span>}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auctionBin">
                  Buy It Now Price <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className={`flex items-stretch rounded-xl border-2 overflow-hidden transition-colors ${hasBidder ? 'border-border bg-muted/30' : 'border-border focus-within:border-foreground'}`}>
                  <span className="flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/40 border-r border-border select-none">USD</span>
                  <input
                    id="auctionBin"
                    type="text"
                    inputMode="decimal"
                    value={auctionBinPrice}
                    onChange={e => !hasBidder && handlePriceInput(e, setAuctionBinPrice)}
                    onBlur={() => !hasBidder && setAuctionBinPrice(formatPriceInput(auctionBinPrice))}
                    readOnly={hasBidder}
                    className={`flex-1 bg-transparent px-3 py-3 text-base font-semibold tabular-nums placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none ${hasBidder ? 'text-muted-foreground cursor-not-allowed' : ''}`}
                    placeholder="0.00"
                  />
                  {hasBidder && <span className="flex items-center pr-3"><Lock className="h-3.5 w-3.5 text-muted-foreground/40" /></span>}
                </div>
                <p className="text-xs text-muted-foreground">A buyer can skip the auction and purchase immediately at this price.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Offers ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {hasBidder && (
            <LockNotice>
              Offer settings cannot be changed once an auction has active bids.
            </LockNotice>
          )}
          <label
            htmlFor="acceptOffers"
            className={`flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3.5 transition-all ${
              hasBidder
                ? 'cursor-not-allowed border-border opacity-60'
                : `cursor-pointer ${acceptOffers ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'}`
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
            <input type="checkbox" id="acceptOffers" checked={acceptOffers} onChange={e => !hasBidder && setAcceptOffers(e.target.checked)} disabled={hasBidder} className="sr-only" />
          </label>

          {acceptOffers && (
            <div className={`rounded-xl border border-border bg-muted/20 p-4 space-y-4 ${hasBidder ? 'opacity-60 pointer-events-none' : ''}`}>
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

      {/* ── Returns Policy ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Returns Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setReturnsPolicy('final_sale')}
              className={`flex flex-col items-start rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                returnsPolicy === 'final_sale' ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
              }`}
            >
              <span className={`text-sm font-semibold ${returnsPolicy === 'final_sale' ? 'text-foreground' : 'text-muted-foreground'}`}>Final Sale</span>
              <span className="text-xs text-muted-foreground mt-0.5">No returns or refunds</span>
            </button>
            <button
              type="button"
              onClick={() => setReturnsPolicy(p => p === 'final_sale' ? 'standard' : p)}
              className={`flex flex-col items-start rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                returnsPolicy !== 'final_sale' ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30'
              }`}
            >
              <span className={`text-sm font-semibold ${returnsPolicy !== 'final_sale' ? 'text-foreground' : 'text-muted-foreground'}`}>Returns Accepted</span>
              <span className="text-xs text-muted-foreground mt-0.5">Define your return terms</span>
            </button>
          </div>

          {returnsPolicy !== 'final_sale' && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(['standard', 'custom'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setReturnsPolicy(t)}
                    className={`rounded-lg border-2 py-2 text-sm font-semibold capitalize transition-all ${
                      returnsPolicy === t
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {returnsPolicy === 'standard' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Return window</p>
                  <div className="flex gap-2">
                    {['7', '14', '30'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setStandardReturnDays(d)}
                        className={`flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-all ${
                          standardReturnDays === d
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border text-muted-foreground hover:border-foreground/30'
                        }`}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Item must be returned in original, unaltered condition. Buyer covers return shipping.
                  </p>
                </div>
              )}
              {returnsPolicy === 'custom' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Describe your return policy</p>
                  <textarea
                    value={customReturnPolicy}
                    onChange={e => setCustomReturnPolicy(e.target.value)}
                    placeholder="e.g. Returns accepted within 7 days if item is not as described. Buyer pays return shipping."
                    rows={4}
                    className="w-full rounded-xl border-2 border-border bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus:border-foreground focus:outline-none transition-colors resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Photos ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Photos <span className="text-destructive text-sm font-normal">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handlePhotoSelect(e.dataTransfer.files) }}
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
              onChange={e => handlePhotoSelect(e.target.files)}
            />
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => { dragIndexRef.current = i }}
                  onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={e => {
                    e.preventDefault()
                    const from = dragIndexRef.current
                    if (from === null || from === i) { setDragOverIndex(null); return }
                    reorderPhotos(from, i)
                    dragIndexRef.current = null
                    setDragOverIndex(null)
                  }}
                  onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null) }}
                  className={`relative aspect-square rounded-lg overflow-hidden border group cursor-grab active:cursor-grabbing transition-all ${
                    dragOverIndex === i ? 'border-foreground ring-2 ring-foreground/20 scale-105' : 'border-border'
                  }`}
                >
                  {i === 0 && (
                    <span className="absolute top-1 left-1 z-10 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                  <img
                    src={photo.type === 'existing' ? photo.url : photo.preview}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(isDraft ? '/sell?tab=draft' : `/listings/${listing.id}`)}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {isDraft && (
            <Button
              type="button"
              size="lg"
              disabled={publishing || submitting}
              onClick={handlePublish}
            >
              {publishing
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
                : 'Publish Listing'
              }
            </Button>
          )}
          <div className="flex flex-col items-end gap-1.5">
            <Button type="submit" size="lg" variant={isDraft ? 'outline' : 'default'} disabled={submitting || publishing}>
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                : isDraft ? 'Save Draft' : 'Save Changes'
              }
            </Button>
            {submitting && (
              <p className="text-xs text-muted-foreground">This may take a few seconds…</p>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
