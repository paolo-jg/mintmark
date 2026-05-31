'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'

interface Props {
  image: string
  imageReverse?: string
  name: string
  priority?: boolean
}

type Phase = 'idle' | 'flipping' | 'showing' | 'fading'

export function CoinCardImage({ image, imageReverse, name, priority = false }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const phaseRef = useRef<Phase>('idle')
  const wantsHover = useRef(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function go(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function startFadeBack() {
    go('fading')
    clearTimeout(fadeTimer.current)
    fadeTimer.current = setTimeout(() => {
      go('idle')
      // If user re-entered during the fade, start the flip now
      if (wantsHover.current) {
        requestAnimationFrame(() => go('flipping'))
      }
    }, 400)
  }

  const handleMouseEnter = useCallback(() => {
    wantsHover.current = true
    // Only act if stable - otherwise wantsHover=true is checked on animation end
    if (phaseRef.current === 'idle') {
      go('flipping')
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    wantsHover.current = false
    // Only act if stable - otherwise wantsHover=false is checked on animation end
    if (phaseRef.current === 'showing') {
      startFadeBack()
    }
  }, [])

  // Called when the 3D flip transition finishes
  const handleTransitionEnd = useCallback((e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return
    if (phaseRef.current !== 'flipping') return

    if (wantsHover.current) {
      go('showing')
    } else {
      // User left during the flip - crossfade back once flip lands
      startFadeBack()
    }
  }, [])

  // No reverse - just show obverse, no interaction needed
  if (!imageReverse) {
    return (
      <div className="aspect-square overflow-hidden bg-white dark:bg-zinc-50 relative">
        <Image src={image} alt={`${name} obverse`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-3" priority={priority} />
      </div>
    )
  }

  const isFlipped = phase === 'flipping' || phase === 'showing' || phase === 'fading'

  return (
    <div
      className="aspect-square relative overflow-hidden bg-white dark:bg-zinc-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D flip container - always stays at 180deg once flipped, never flips back */}
      <div
        onTransitionEnd={handleTransitionEnd}
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          perspective: '700px',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: phase === 'flipping' ? 'transform 0.5s ease-in-out' : 'none',
        }}
      >
        {/* Obverse */}
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          <Image src={image} alt={`${name} obverse`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-3" priority={priority} />
        </div>
        {/* Reverse */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <Image src={imageReverse} alt={`${name} reverse`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-3" priority={priority} />
        </div>
      </div>

      {/* Crossfade overlay - obverse fades in on mouse-leave, instant hide otherwise */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: phase === 'fading' ? 1 : 0,
          transition: phase === 'fading' ? 'opacity 0.4s ease-in-out' : 'none',
        }}
      >
        <Image src={image} alt={`${name} obverse`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-3" priority={priority} />
      </div>
    </div>
  )
}
