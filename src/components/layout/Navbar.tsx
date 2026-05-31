'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LOGO_HORIZONTAL } from '@/lib/brand'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useNavContext } from '@/components/layout/nav-context'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
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
    // Never show auth state on the marketing domain - only my.pedigreecoins.com is the app
    const host = window.location.hostname
    const isAppDomain = host.startsWith('my.') || host === 'localhost' || host.startsWith('127.')
    if (!isAppDomain) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
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
    const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL
    window.location.href = marketingUrl || '/'
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="relative flex items-center h-20 px-4 sm:px-6 lg:px-8">
          {/* Logo - absolute left edge */}
          <div className="absolute left-4">
            <Link href="/" className="flex items-center w-fit">
              <img src={LOGO_HORIZONTAL} alt="Pedigree Coins" className="object-contain h-14 w-auto" />
            </Link>
          </div>

          {/* Desktop nav - true center */}
          <nav className="hidden md:flex items-center gap-2 mx-auto">
            {[
              { href: '/', label: 'Home' },
              { href: '/listings', label: user ? 'Buy' : 'Browse' },
              { href: '/sell', label: 'Sell' },
              { href: '/collect', label: 'Collect' },
              ...(user ? [{ href: '/dealers', label: 'Dealers' }, { href: '/leaderboard', label: 'Leaderboard' }] : [{ href: '/pricing', label: 'Pricing' }]),
            ].map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-[15px] font-semibold tracking-wide transition-colors ${
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop actions - absolute right edge */}
          <div className="absolute right-4 sm:right-6 lg:right-8 hidden md:flex items-center gap-3">
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="flex items-center justify-center rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                    }
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" render={<Link href="/auth/login" />} className="h-10 px-5 text-sm">
                  Sign In
                </Button>
                <Button render={<Link href="/auth/register" />} className="h-10 px-5 text-sm">
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-3 py-3 space-y-1">
          {[
            { href: '/', label: 'Home' },
            { href: '/listings', label: user ? 'Buy' : 'Browse' },
            { href: '/sell', label: 'Sell' },
            { href: '/collect', label: 'Collect' },
            ...(user ? [{ href: '/dealers', label: 'Dealers' }] : [{ href: '/pricing', label: 'Pricing' }]),
          ].map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-base font-semibold tracking-wide transition-colors ${
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            )
          })}
          {user ? (
            <>
              <Link
                href="/leaderboard"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
              <button onClick={signOut} className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-destructive">
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" render={<Link href="/auth/login" />} className="h-10 px-5 text-sm">Sign In</Button>
              <Button render={<Link href="/auth/register" />} className="h-10 px-5 text-sm">Get Started</Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
