'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LOGO_HORIZONTAL } from '@/lib/brand'
import { createClient } from '@/lib/supabase/client'
import {
  Home, ShoppingBag, Tag, Archive, Users, Trophy, CreditCard, LogOut, Menu, X, Settings,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { useNavContext } from '@/components/layout/nav-context'

function NavItems({
  user,
  isDealer,
  isActive,
  onNav,
}: {
  user: User | null
  isDealer: boolean
  isActive: (href: string) => boolean
  onNav: () => void
}) {
  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/listings', label: user ? 'Buy' : 'Browse', icon: ShoppingBag },
    { href: '/sell', label: 'Sell', icon: Tag },
    { href: '/collect', label: isDealer ? 'Inventory' : 'Collect', icon: Archive },
    ...(user
      ? [
          { href: '/dealers', label: 'Dealers', icon: Users },
          { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
        ]
      : [{ href: '/pricing', label: 'Pricing', icon: CreditCard }]),
  ]

  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </>
  )
}

export default function Sidebar() {
  const [user, setUser] = useState<User | null>(null)
  const [isDealer, setIsDealer] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { sectionOverride } = useNavContext()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    if (href === '/sell') {
      if (sectionOverride === 'sell') return true
      if (sectionOverride === 'buy') return false
      return pathname.startsWith('/sell') || pathname.startsWith('/listings/new') || /^\/listings\/[^/]+\/edit/.test(pathname)
    }
    if (href === '/listings') {
      if (sectionOverride === 'buy') return true
      if (sectionOverride === 'sell') return false
      return pathname.startsWith('/listings') && !pathname.startsWith('/listings/new') && !/^\/listings\/[^/]+\/edit/.test(pathname)
    }
    if (href === '/leaderboard') {
      if (sectionOverride === 'leaderboard') return true
    }
    return pathname.startsWith(href)
  }

  useEffect(() => {
    const host = window.location.hostname
    const isAppDomain = host.startsWith('my.') || host === 'localhost' || host.startsWith('127.')
    if (!isAppDomain) return

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', data.user.id)
          .single()
        setIsDealer(profile?.subscription_tier === 'dealer')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        window.location.href = process.env.NEXT_PUBLIC_MARKETING_URL || '/'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = process.env.NEXT_PUBLIC_MARKETING_URL || '/'
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??'

  const userSection = user ? (
    <div className="space-y-0.5">
      <Link
        href="/settings"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Avatar className="h-5 w-5 shrink-0">
          <AvatarImage src={user.user_metadata?.avatar_url} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="flex items-center gap-2">
          Settings
          <Settings className="h-3.5 w-3.5 text-muted-foreground/60" />
        </span>
      </Link>
      <button
        onClick={signOut}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-destructive hover:bg-muted transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign Out
      </button>
    </div>
  ) : (
    <div className="space-y-2 px-1">
      <Link
        href="/auth/login"
        className="flex items-center justify-center w-full px-4 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/auth/register"
        className="flex items-center justify-center w-full px-4 py-2 rounded-lg text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        Get Started
      </Link>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 bg-background border-r border-border z-50">
        <div className="p-4 pb-5">
          <Link href="/">
            <img src={LOGO_HORIZONTAL} alt="Pedigree Coins" className="h-10 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          <NavItems user={user} isDealer={isDealer} isActive={isActive} onNav={() => {}} />
        </nav>
        <div className="p-2 border-t border-border">
          {userSection}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-50 flex items-center justify-between px-4">
        <Link href="/">
          <img src={LOGO_HORIZONTAL} alt="Pedigree Coins" className="h-8 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 h-screen w-64 bg-background border-r border-border z-50 flex flex-col">
            <div className="p-4 pb-5 flex items-center justify-between">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <img src={LOGO_HORIZONTAL} alt="Pedigree Coins" className="h-9 w-auto object-contain" />
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
              <NavItems user={user} isDealer={isDealer} isActive={isActive} onNav={() => setMobileOpen(false)} />
            </nav>
            <div className="p-2 border-t border-border">
              {userSection}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
