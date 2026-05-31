export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { OrderClient } from './_components/order-client'

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <OrderClient id={id} />
    </Suspense>
  )
}
