export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCents } from '@/lib/utils'
import { Package, Shield, ExternalLink, Lock } from 'lucide-react'
import type { OrderStatus, TrackingStatus } from '@/types'
import FileDisputeButton from './_components/file-dispute-button'
import { ConfirmReceiptButton } from './_components/confirm-receipt-button'

const TRACKING_STEPS: TrackingStatus[] = ['pre_transit', 'transit', 'delivered']

const TRACKING_LABELS: Record<TrackingStatus, string> = {
  pre_transit: 'Label Created',
  transit: 'In Transit',
  delivered: 'Delivered',
  returned: 'Returned',
  failure: 'Delivery Issue',
  unknown: 'Unknown',
}

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_shipment: 'Awaiting Shipment',
  label_purchased: 'Label Purchased',
  shipped: 'Shipped',
  delivered: 'Delivered',
  disputed: 'Disputed',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirectTo=/orders/${id}`)

  const { data: order } = await supabase
    .from('orders')
    .select('*, shipments(*)')
    .eq('id', id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (!order) notFound()

  const shipment = order.shipments?.[0] ?? null
  const isBuyer = order.buyer_id === user.id
  const currentTrackingStatus: TrackingStatus = shipment?.tracking_status ?? 'pre_transit'
  const currentStepIndex = TRACKING_STEPS.indexOf(currentTrackingStatus)

  const autoConfirmAt = order.auto_confirm_at ? new Date(order.auto_confirm_at) : null
  const isComplete = order.status === 'complete' || order.transfer_released
  const isShipped = ['shipped', 'delivered', 'complete'].includes(order.status)
  const canDispute = isBuyer && !isComplete && ['shipped', 'delivered', 'awaiting_shipment'].includes(order.status)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatCents(order.amount)}</p>
        </div>
        <Badge>{ORDER_STATUS_LABELS[(order.status as OrderStatus)] ?? order.status}</Badge>
      </div>

      {/* Tracking progress */}
      {shipment ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Shipment Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-0">
              {TRACKING_STEPS.map((step, i) => {
                const isComplete = i <= currentStepIndex
                const isCurrent = i === currentStepIndex
                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`h-3 w-3 rounded-full border-2 transition-colors ${
                        isComplete
                          ? 'bg-primary border-primary'
                          : 'bg-background border-muted-foreground/30'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`} />
                      <span className={`text-xs whitespace-nowrap ${isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {TRACKING_LABELS[step]}
                      </span>
                    </div>
                    {i < TRACKING_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carrier</span>
                <span>{shipment.carrier}{shipment.service_level ? ` · ${shipment.service_level}` : ''}</span>
              </div>
              {shipment.tracking_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tracking #</span>
                  <span className="font-mono">{shipment.tracking_number}</span>
                </div>
              )}
              {shipment.estimated_delivery_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Delivery</span>
                  <span>{new Date(shipment.estimated_delivery_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              {shipment.insured && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Insurance</span>
                  <div className="flex items-center gap-1 text-green-700 dark:text-green-500">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Insured for {formatCents(shipment.insured_value)}</span>
                  </div>
                </div>
              )}
            </div>

            {shipment.tracking_url && (
              <Button variant="outline" className="w-full" render={<a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Track on Carrier Site
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {isBuyer
                ? "The seller is preparing your shipment. You'll receive an email with tracking once it ships."
                : 'Enter a tracking number to ship this order and release your payout.'}
            </p>
            {!isBuyer && order.status === 'awaiting_shipment' && (
              <Button className="mt-4" render={<a href={`/dashboard/orders/${order.id}/ship`} />}>
                Ship This Order
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shipping address */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Ship To</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-0.5">
          <p className="font-medium">{order.ship_to_name}</p>
          <p className="text-muted-foreground">{order.ship_to_street1}</p>
          {order.ship_to_street2 && <p className="text-muted-foreground">{order.ship_to_street2}</p>}
          <p className="text-muted-foreground">
            {order.ship_to_city}, {order.ship_to_state} {order.ship_to_zip}
          </p>
        </CardContent>
      </Card>

      {/* Buyer: confirm receipt (once shipped, not yet complete) */}
      {isBuyer && isShipped && !isComplete && order.status !== 'disputed' && (
        <div className="mb-6">
          <ConfirmReceiptButton
            orderId={order.id}
            autoConfirmAt={order.auto_confirm_at}
            onConfirmed={() => {}}
          />
        </div>
      )}

      {/* Order complete */}
      {isComplete && (
        <Card className="mb-6 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Order complete</p>
              <p className="text-xs text-muted-foreground mt-0.5">Payment has been released. All sales are final.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute window — only while order is active and not yet complete */}
      {canDispute && (
        <div className="text-center pt-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            {autoConfirmAt
              ? <>Dispute deadline: <strong>{autoConfirmAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong> — 48 hours after confirmation or 14 days from ship date, whichever comes first.</>
              : 'You have 48 hours after confirming receipt, or 14 days from the ship date, to file a dispute.'}
          </p>
          <FileDisputeButton orderId={order.id} />
        </div>
      )}

      {/* All Sales Final notice — once shipped */}
      {isShipped && !canDispute && !isComplete && order.status !== 'disputed' && (
        <p className="text-center text-xs text-muted-foreground pt-2">
          All sales are final. Contact support if you have not received your package.
        </p>
      )}

      {order.status === 'disputed' && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Dispute in progress</p>
            <p className="text-xs text-muted-foreground mt-0.5">Our team is reviewing this order. You will be notified of the outcome.</p>
          </CardContent>
        </Card>
      )}

      {order.status === 'cancelled' && (
        <Card className="border-muted">
          <CardContent className="py-4">
            <p className="text-sm font-medium">Order cancelled</p>
            <p className="text-xs text-muted-foreground mt-0.5">This order was cancelled and the buyer has been refunded.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
