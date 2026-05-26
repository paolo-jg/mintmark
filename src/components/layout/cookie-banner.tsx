'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const STORAGE_KEY = 'pc_cookie_consent'

type ConsentValue = 'accepted' | 'declined'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
  }, [])

  function respond(value: ConsentValue) {
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies to operate the site and analyze traffic. See our{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Privacy Policy
          </Link>{' '}
          for details, including how to opt out.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => respond('declined')}>
            Decline
          </Button>
          <Button size="sm" onClick={() => respond('accepted')}>
            Accept
          </Button>
          <button
            onClick={() => respond('declined')}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
