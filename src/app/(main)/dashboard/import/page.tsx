export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { ImportClient } from './_components/import-client'

export const metadata = { title: 'Bulk Import – Pedigree Coins' }

export default function ImportPage() {
  return (
    <Suspense>
      <ImportClient />
    </Suspense>
  )
}
