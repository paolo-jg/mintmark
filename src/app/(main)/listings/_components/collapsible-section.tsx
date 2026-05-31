'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  itemCount: number
  children: React.ReactNode
  defaultOpen?: boolean
}

export function CollapsibleSection({
  title,
  itemCount,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full group flex items-center gap-3 px-3.5 py-2.5 mb-0 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-foreground/20 transition-all duration-200 cursor-pointer"
      >
        {/* Chevron - left-aligned so it's the first thing you see */}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            open ? 'rotate-0' : '-rotate-90'
          }`}
        />

        {/* Label */}
        <span className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-foreground whitespace-nowrap">
          {title}
        </span>

        {/* Rule */}
        <div className="flex-1 h-px bg-border" />

        {/* Count pill */}
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground bg-background border border-border rounded-full px-2 py-0.5">
          {itemCount}
        </span>
      </button>

      {/* Animated content */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-5 pb-1">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
