import { Suspense } from 'react'
import { TeamClient } from './_components/team-client'

export const metadata = { title: 'Team – Pedigree Coins' }

export default function TeamPage() {
  return (
    <Suspense>
      <TeamClient />
    </Suspense>
  )
}
