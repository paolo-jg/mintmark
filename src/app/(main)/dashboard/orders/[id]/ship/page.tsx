'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, Shield, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatCents } from '@/lib/utils'
import { INSURANCE_THRESHOLD_CENTS } from '@/lib/shippo'

interface Rate {
  objectId: string
  provider: string
  servicelevel: { name: string; token: string }
  amount: string
  estimatedDays: number
  attributes: string[]
  includesInsurance?: boolean
}

export default function ShipOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params)
  const router = useRouter()

  // Parcel dimensions
  const [weightOz, setWeightOz] = useState('')
  const [lengthIn, setLengthIn] = useState('3')
  const [widthIn, setWidthIn] = useState('3')
  const [heightIn, setHeightIn] = useState('2')

  // Rates
  const [rates, setRates] = useState<Rate[]>([])
  const [shippoShipmentId, setShippoShipmentId] = useState('')
  const [mustInsure, setMustInsure] = useState(false)
  const [insuredValueCents, setInsuredValueCents] = useState(0)
  const [fetchingRates, setFetchingRates] = useState(false)

  // Label purchase
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [purchasingLabel, setPurchasingLabel] = useState(false)
  const [labelUrl, setLabelUrl] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null)

  const fetchRates = async (e: React.FormEvent) => {
    e.preventDefault()
    setFetchingRates(true)
    setRates([])
    setSelectedRateId(null)

    try {
      const res = await fetch('/api/shippo/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          parcel: {
            weightOz: parseFloat(weightOz),
            lengthIn: parseFloat(lengthIn),
            widthIn: parseFloat(widthIn),
            heightIn: parseFloat(heightIn),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to get rates')
        return
      }
      setRates(data.rates)
      setShippoShipmentId(data.shippoShipmentId)
      setMustInsure(data.mustInsure)
      setInsuredValueCents(data.insuredValueCents)
    } catch {
      toast.error('Failed to get shipping rates')
    } finally {
      setFetchingRates(false)
    }
  }

  const purchaseLabel = async () => {
    if (!selectedRateId) return
    setPurchasingLabel(true)

    const rate = rates.find(r => r.objectId === selectedRateId)!

    try {
      const res = await fetch('/api/shippo/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rateObjectId: selectedRateId,
          carrier: rate.provider,
          serviceLevel: rate.servicelevel.name,
          rateAmountCents: Math.round(parseFloat(rate.amount) * 100),
          estimatedDays: rate.estimatedDays,
          shippoShipmentId,
          weightOz: parseFloat(weightOz),
          lengthIn: parseFloat(lengthIn),
          widthIn: parseFloat(widthIn),
          heightIn: parseFloat(heightIn),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Label purchase failed')
        return
      }
      setLabelUrl(data.labelUrl)
      setTrackingNumber(data.trackingNumber)
      toast.success('Label purchased!')
    } catch {
      toast.error('Failed to purchase label')
    } finally {
      setPurchasingLabel(false)
    }
  }

  // Success state
  if (labelUrl && trackingNumber) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Label Ready
            </CardTitle>
            <CardDescription>
              Your shipping label has been purchased. Print it and drop off the package.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Tracking number</p>
              <p className="font-mono font-semibold">{trackingNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => window.open(labelUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Print Label (PDF)
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              The buyer will be notified automatically when tracking updates are received.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Ship Order</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Enter parcel dimensions to get live carrier rates, then purchase a label.
      </p>

      {mustInsure && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm flex gap-2">
          <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            This order exceeds {formatCents(INSURANCE_THRESHOLD_CENTS)}. Insurance is required and will be
            included automatically in your rate quotes.
            Insured value: <strong>{formatCents(insuredValueCents)}</strong>.
          </span>
        </div>
      )}

      {/* Step 1: Parcel dimensions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">1. Package Details</CardTitle>
          <CardDescription>
            Graded coin slabs typically ship in small flat-rate or padded boxes.
            Typical slab: ~3 oz, 3×3×2 in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={fetchRates} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="weight">Weight (oz)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={weightOz}
                  onChange={e => setWeightOz(e.target.value)}
                  placeholder="e.g. 3.5"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="length">Length (in)</Label>
                <Input id="length" type="number" min="0.1" step="0.1" value={lengthIn} onChange={e => setLengthIn(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="width">Width (in)</Label>
                <Input id="width" type="number" min="0.1" step="0.1" value={widthIn} onChange={e => setWidthIn(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="height">Height (in)</Label>
                <Input id="height" type="number" min="0.1" step="0.1" value={heightIn} onChange={e => setHeightIn(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" disabled={fetchingRates} className="w-full">
              {fetchingRates ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Getting Rates…</> : 'Get Rates'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Step 2: Select rate */}
      {rates.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">2. Select a Carrier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rates.map(rate => (
              <button
                key={rate.objectId}
                onClick={() => setSelectedRateId(rate.objectId)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedRateId === rate.objectId
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {rate.provider} · {rate.servicelevel.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Est. {rate.estimatedDays} {rate.estimatedDays === 1 ? 'day' : 'days'}
                      {mustInsure && ' · Includes insurance'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rate.attributes?.includes('BESTVALUE') && (
                      <Badge variant="secondary" className="text-xs">Best value</Badge>
                    )}
                    {rate.attributes?.includes('FASTEST') && (
                      <Badge variant="secondary" className="text-xs">Fastest</Badge>
                    )}
                    <span className="font-semibold text-sm">${rate.amount}</span>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Purchase */}
      {selectedRateId && (
        <Button
          size="lg"
          className="w-full"
          onClick={purchaseLabel}
          disabled={purchasingLabel}
        >
          {purchasingLabel
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Purchasing Label…</>
            : `Purchase Label · $${rates.find(r => r.objectId === selectedRateId)?.amount}`
          }
        </Button>
      )}
    </div>
  )
}
