import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import type { OrderStatus } from '@/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_shipment: 'Awaiting Shipment',
  label_purchased: 'Label Purchased',
  shipped: 'Shipped',
  delivered: 'Delivered',
  disputed: 'Disputed',
  complete: 'Complete',
}

const STATUS_VARIANTS: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  awaiting_shipment: 'destructive',
  label_purchased: 'secondary',
  shipped: 'default',
  delivered: 'default',
  disputed: 'destructive',
  complete: 'outline',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/dashboard')

  const [{ data: sellingOrders }, { data: buyingOrders }, { data: listings }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, shipments(*)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('orders')
      .select('*, shipments(*)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('listings')
      .select('id, title, status, price, listing_type, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const pendingShipments = sellingOrders?.filter(o => o.status === 'awaiting_shipment') ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button render={<Link href="/listings/new" />}>List a Coin</Button>
      </div>

      {/* Action needed banner */}
      {pendingShipments.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm flex items-center justify-between">
          <span>
            <strong>{pendingShipments.length}</strong>{' '}
            {pendingShipments.length === 1 ? 'order needs' : 'orders need'} to be shipped
          </span>
          <Button size="sm" variant="destructive" render={<Link href="/dashboard/orders" />}>
            Ship Now
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Selling orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Sales</CardTitle>
            <Link href="/dashboard/orders" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {!sellingOrders?.length ? (
              <p className="text-sm text-muted-foreground py-4">No sales yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {sellingOrders.map(order => (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.ship_to_name}</p>
                      <p className="text-xs text-muted-foreground">{formatCents(order.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_VARIANTS[order.status as OrderStatus]} className="text-xs">
                        {STATUS_LABELS[order.status as OrderStatus]}
                      </Badge>
                      {order.status === 'awaiting_shipment' && (
                        <Button size="sm" render={<Link href={`/dashboard/orders/${order.id}/ship`} />}>
                          Ship
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buying orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {!buyingOrders?.length ? (
              <p className="text-sm text-muted-foreground py-4">No purchases yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {buyingOrders.map(order => (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{formatCents(order.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_VARIANTS[order.status as OrderStatus]} className="text-xs">
                        {STATUS_LABELS[order.status as OrderStatus]}
                      </Badge>
                      <Button size="sm" variant="outline" render={<Link href={`/orders/${order.id}`} />}>
                        Track
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active listings */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Your Listings</CardTitle>
            <Link href="/listings/new" className="text-xs text-muted-foreground hover:text-foreground">
              + New listing
            </Link>
          </CardHeader>
          <CardContent>
            {!listings?.length ? (
              <p className="text-sm text-muted-foreground py-4">No listings yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {listings.map(listing => (
                  <div key={listing.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/listings/${listing.id}`} className="text-sm font-medium hover:underline truncate block">
                        {listing.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {listing.listing_type === 'fixed' ? formatCents(listing.price) : 'Auction'}
                      </p>
                    </div>
                    <Badge
                      variant={listing.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {listing.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
