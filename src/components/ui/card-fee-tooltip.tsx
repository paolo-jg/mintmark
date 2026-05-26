'use client'

import { Info } from 'lucide-react'
import { useState, useRef } from 'react'

function BuyerFeeTooltip() {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 120) }

  return (
    <span className="relative inline-flex items-center align-middle ml-1">
      <button
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={() => setOpen(v => !v)}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors focus:outline-none"
        aria-label="Buyer fee info"
        type="button"
      >
        <Info className="h-3 w-3" />
      </button>

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute left-1/2 -translate-x-1/2 bottom-6 z-50 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-4"
        >
          <p className="text-xs font-semibold mb-1">Buyer Fee</p>
          <p className="text-xs text-muted-foreground">
            Added to the purchase price at checkout and charged to the buyer. It is not deducted from the seller&apos;s payout.
          </p>
        </div>
      )}
    </span>
  )
}

function CardFeeTooltip() {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }
  const hide = () => {
    timer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <span className="relative inline-flex items-center align-middle ml-1">
      <button
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={() => setOpen(v => !v)}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors focus:outline-none"
        aria-label="Card processing fee info"
        type="button"
      >
        <Info className="h-3 w-3" />
      </button>

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          className="absolute left-1/2 -translate-x-1/2 bottom-6 z-50 w-72 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-4"
        >
          <p className="text-xs font-semibold mb-2">Card Processing Fees</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>US cards</span>
              <span className="font-mono font-medium text-foreground">2.9% + $0.30</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>International cards</span>
              <span className="font-mono font-medium text-foreground">4.4% + $0.30</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>ACH / bank transfer</span>
              <span className="font-mono font-medium text-foreground">0.8%, max $5</span>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground/60 border-t border-border pt-2">
            Charged by Stripe, not a Pedigree Coins fee.
          </p>
        </div>
      )}
    </span>
  )
}

/** Renders a feature string, injecting tooltips after "buyer fee" and "card processing fees". */
export function FeatureText({ text }: { text: string }) {
  const buyerMarker = 'buyer fee'
  const cardMarker = 'card processing fees'

  const cardIdx = text.indexOf(cardMarker)
  if (cardIdx !== -1) {
    const before = text.slice(0, cardIdx + cardMarker.length)
    const after = text.slice(cardIdx + cardMarker.length)
    return <>{before}<CardFeeTooltip />{after}</>
  }

  const buyerIdx = text.indexOf(buyerMarker)
  if (buyerIdx !== -1) {
    const before = text.slice(0, buyerIdx + buyerMarker.length)
    const after = text.slice(buyerIdx + buyerMarker.length)
    return <>{before}<BuyerFeeTooltip />{after}</>
  }

  return <>{text}</>
}
