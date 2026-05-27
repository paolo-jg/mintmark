import { Suspense } from 'react'
import { PortfolioClient } from './_components/portfolio-client'

export const metadata = { title: 'Portfolio Valuation – Pedigree Coins' }

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioClient />
    </Suspense>
  )
}
