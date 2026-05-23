'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GRADING_SERVICES, getVerificationBadgeLabel } from '@/lib/grading'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle2, AlertCircle, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { GradingService, CoinGrade, ListingType } from '@/types'
import { DevBanner } from '@/components/dev/dev-banner'

export default function NewListingPage() {
  const router = useRouter()
  const supabase = createClient()

  // Grading step
  const [service, setService] = useState<GradingService>('PCGS')
  const [certNumber, setCertNumber] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [coinGrade, setCoinGrade] = useState<Partial<CoinGrade> | null>(null)
  const [cacDesignation, setCacDesignation] = useState(false)

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const supabase = createClient()
    const urls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('listing-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(path)
      urls.push(publicUrl)
    }
    return urls
  }

  // Listing details
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listingType, setListingType] = useState<ListingType>('fixed')
  const [price, setPrice] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [auctionDays, setAuctionDays] = useState('7')
  const [submitting, setSubmitting] = useState(false)

  const lookupCert = async () => {
    if (!certNumber.trim()) return
    setLookingUp(true)
    setCoinGrade(null)
    try {
      const res = await fetch(`/api/cert-lookup?service=${service}&certNumber=${certNumber.trim()}`)
      const data = await res.json()
      if (data.success && data.data) {
        setCoinGrade(data.data)
        if (data.data.coinName) {
          setTitle(data.data.coinName)
        }
      } else {
        toast.error(data.error ?? 'Cert not found')
      }
    } catch {
      toast.error('Failed to look up cert')
    } finally {
      setLookingUp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coinGrade) {
      toast.error('Look up your cert number first')
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

    const listingData = {
      seller_id: user.id,
      title: title.trim(),
      description: description.trim(),
      listing_type: listingType,
      price: listingType === 'fixed' ? Math.round(parseFloat(price) * 100) : null,
      status: 'active',
      grading_service: service,
      cert_number: certNumber.trim(),
      grade: coinGrade.grade ?? '',
      verification_status: coinGrade.verificationStatus ?? 'unverified',
      cac_designation: cacDesignation,
      coin_name: coinGrade.coinName,
      year: coinGrade.year,
      mint_mark: coinGrade.mintMark,
      denomination: coinGrade.denomination,
      population_at_grade: coinGrade.populationAtGrade,
      population_above: coinGrade.populationAbove,
      grading_service_image_url: coinGrade.pcgsImageUrl,
      images: imageUrls.length > 0 ? imageUrls : undefined,
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

  const selectedServiceMeta = GRADING_SERVICES.find(s => s.value === service)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-1">List a Coin</h1>
      <p className="text-muted-foreground text-sm mb-8">Enter your cert number to get started. Details are pulled automatically for PCGS and NGC coins.</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Cert Lookup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Grading & Certification</CardTitle>
            <CardDescription>Enter your grading service and certificate number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Grading Service</Label>
                <Select value={service} onValueChange={v => { if (v) { setService(v as GradingService); setCoinGrade(null) } }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADING_SERVICES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          {s.label}
                          {s.autoVerified && <Badge variant="secondary" className="text-xs">Auto-verified</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Cert result */}
            {coinGrade && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {coinGrade.verificationStatus === 'verified'
                    ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                    : <AlertCircle className="h-4 w-4 text-amber-500" />
                  }
                  <Badge variant={coinGrade.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                    {getVerificationBadgeLabel(coinGrade.verificationStatus!)}
                  </Badge>
                  {!selectedServiceMeta?.autoVerified && (
                    <span className="text-xs text-muted-foreground">
                      {service} certs cannot be auto-verified. This listing will show an unverified badge.
                    </span>
                  )}
                </div>
                {coinGrade.coinName && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div><span className="text-muted-foreground">Coin:</span> {coinGrade.coinName}</div>
                    {coinGrade.grade && <div><span className="text-muted-foreground">Grade:</span> {coinGrade.grade}</div>}
                    {coinGrade.year && <div><span className="text-muted-foreground">Year:</span> {coinGrade.year}</div>}
                    {coinGrade.mintMark && <div><span className="text-muted-foreground">Mint Mark:</span> {coinGrade.mintMark}</div>}
                    {coinGrade.populationAtGrade !== undefined && (
                      <div><span className="text-muted-foreground">Pop at grade:</span> {coinGrade.populationAtGrade}</div>
                    )}
                    {coinGrade.populationAbove !== undefined && (
                      <div><span className="text-muted-foreground">Pop above:</span> {coinGrade.populationAbove}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CAC designation */}
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
          </CardContent>
        </Card>

        {/* Step 2: Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Photos</CardTitle>
            <CardDescription>Add up to 8 photos. The first image will be shown as the cover.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-foreground/30 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault() }}
              onDrop={e => { e.preventDefault(); handleImageSelect(e.dataTransfer.files) }}
            >
              <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Click or drag photos here</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — up to 8 images</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleImageSelect(e.target.files)}
              />
            </div>

            {/* Previews */}
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

        {/* Step 3: Listing details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Listing Details</CardTitle>
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
              <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
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

        {/* Step 4: Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Pricing & Format</CardTitle>
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
                    <Label htmlFor="reservePrice">Reserve Price <span className="text-muted-foreground font-normal">(optional)</span></Label>
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

        <Separator />

        <Button type="submit" size="lg" className="w-full" disabled={submitting || !coinGrade}>
          {uploadingImages
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading photos…</>
            : submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing…</>
            : 'Publish Listing'
          }
        </Button>
      </form>
      <DevBanner />
    </div>
  )
}
