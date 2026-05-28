import { Suspense } from 'react'
import { SettingsLoader } from './_components/settings-loader'

export const metadata = { title: 'Settings – Pedigree Coins' }

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsLoader />
    </Suspense>
  )
}
