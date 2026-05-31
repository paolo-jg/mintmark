export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { AnalyticsClient } from './_components/analytics-client'

export const metadata = { title: 'Analytics – Pedigree Coins' }

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsClient />
    </Suspense>
  )
}
