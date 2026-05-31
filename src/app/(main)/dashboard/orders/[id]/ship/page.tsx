'use client'

export const dynamic = 'force-dynamic'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Package, ExternalLink, Copy, Check, ChevronDown, Banknote } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL', 'Other']

interface OrderDetails {
  id: string
  status: string
  amount: number
  ship_to_name: string
  ship_to_street1: string
  ship_to_street2: string | null
  ship_to_city: string
  ship_to_state: string
  ship_to_zip: string
  ship_to_country: string
  listing: { coin_name: string | null; title: string | null } | null
}

export default function ShipOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params)
  const router = useRouter()

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [carrier, setCarrier] = useState('USPS')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('orders')
      .select('id, status, amount, ship_to_name, ship_to_street1, ship_to_street2, ship_to_city, ship_to_state, ship_to_zip, ship_to_country, listing:listings!orders_listing_id_fkey(coin_name, title)')
      .eq('id', orderId)
      .single()
      .then(({ data }) => {
        setOrder(data as OrderDetails | null)
        setLoading(false)
      })
  }, [orderId])

  const formattedAddress = order
    ? [
        order.ship_to_name,
        order.ship_to_street1,
        order.ship_to_street2,
        `${order.ship_to_city}, ${order.ship_to_state} ${order.ship_to_zip}`,
        order.ship_to_country !== 'US' ? order.ship_to_country : null,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  function copyAddress() {
    navigator.clipboard.writeText(formattedAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackingNumber.trim() || !carrier) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim(), carrier }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to mark as shipped')
        return
      }
      toast.success('Order marked as shipped - buyer notified')
      router.push('/dashboard/sales')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    )
  }

  const coinName = order.listing?.coin_name ?? order.listing?.title ?? 'this order'

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Ship Order</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{coinName}</p>
      </div>

      {/* Payout hold callout */}
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 flex items-start gap-3">
        <Banknote className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Your payout won't be released until you submit a tracking number.</strong>{' '}
          Drop off the package first, then enter the tracking number below.
        </p>
      </div>

      {/* Ship-to address */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Ship to</CardTitle>
            <button
              type="button"
              onClick={copyAddress}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy address'}
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-foreground">
            {formattedAddress}
          </pre>
        </CardContent>
      </Card>

      {/* Create label (optional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Create a label (optional)</CardTitle>
          <CardDescription className="text-xs">
            Use your preferred carrier's website. Copy the address above, paste it in, and come back to enter your tracking number.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex flex-wrap gap-2">
          <a
            href="https://cns.usps.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ExternalLink className="h-3 w-3" />
              USPS Click-N-Ship
            </Button>
          </a>
          <a
            href="https://www.ups.com/us/en/support/shipping-support/create-a-shipment.page"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ExternalLink className="h-3 w-3" />
              UPS
            </Button>
          </a>
          <a
            href="https://www.fedex.com/en-us/shipping/ship-manager.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ExternalLink className="h-3 w-3" />
              FedEx
            </Button>
          </a>
          <a
            href="https://mydhl.express.dhl/us/en/ship.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ExternalLink className="h-3 w-3" />
              DHL
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Tracking number entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Enter tracking number</CardTitle>
          <CardDescription className="text-xs">
            Required to release your payout. The buyer will receive an email with the tracking number.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="carrier" className="text-xs">Carrier</Label>
              <div className="relative">
                <select
                  id="carrier"
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tracking" className="text-xs">Tracking number</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="e.g. 9400111899223397765978"
                className="font-mono text-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !trackingNumber.trim()}
              >
                {submitting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Marking shipped…</>
                  : <><Package className="h-3.5 w-3.5 mr-1.5" />Mark as Shipped</>
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
