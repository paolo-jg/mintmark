'use client'

import { useState } from 'react'

export function PricingToggle({ onBillingChange }: { onBillingChange: (v: 'monthly' | 'annual') => void }) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const toggle = (v: 'monthly' | 'annual') => {
    setBilling(v)
    onBillingChange(v)
  }

  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      <span
        className={`text-sm font-medium cursor-pointer select-none transition-colors ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}
        onClick={() => toggle('monthly')}
      >
        Monthly
      </span>
      <button
        onClick={() => toggle(billing === 'monthly' ? 'annual' : 'monthly')}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${billing === 'annual' ? 'bg-foreground' : 'bg-muted'}`}
        role="switch"
        aria-checked={billing === 'annual'}
        aria-label="Toggle annual billing"
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${billing === 'annual' ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
      <span
        className={`text-sm font-medium cursor-pointer select-none transition-colors ${billing === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}
        onClick={() => toggle('annual')}
      >
        Annual
        <span className="ml-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
          Save up to 17%
        </span>
      </span>
    </div>
  )
}
