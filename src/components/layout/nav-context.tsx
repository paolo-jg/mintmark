'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type NavSection = 'sell' | 'buy' | 'leaderboard' | null

interface NavContextValue {
  sectionOverride: NavSection
  setSectionOverride: (s: NavSection) => void
}

const NavContext = createContext<NavContextValue>({
  sectionOverride: null,
  setSectionOverride: () => {},
})

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [sectionOverride, setSectionOverride] = useState<NavSection>(null)
  return (
    <NavContext.Provider value={{ sectionOverride, setSectionOverride }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNavContext() {
  return useContext(NavContext)
}

export function SetNavSection({ section }: { section: NavSection }) {
  const { setSectionOverride } = useNavContext()
  useEffect(() => {
    setSectionOverride(section)
    return () => setSectionOverride(null)
  }, [section, setSectionOverride])
  return null
}
