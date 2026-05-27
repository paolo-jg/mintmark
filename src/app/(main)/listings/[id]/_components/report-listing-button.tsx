'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { ReportModal } from './report-modal'

interface Props {
  listingId: string
}

export function ReportListingButton({ listingId }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <Flag className="h-3 w-3" />
        Report listing
      </button>
      {open && (
        <ReportModal listingId={listingId} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
