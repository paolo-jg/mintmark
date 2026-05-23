'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { Coins, Menu, X, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <Coins className="h-5 w-5" />
            Pedigree Coins
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {[
              { href: '/', label: 'Home' },
              { href: '/listings', label: 'Browse' },
              { href: '/listings/new', label: 'Sell' },
              { href: '/collect', label: 'Collect' },
              ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
            ].map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-[17px] font-semibold tracking-wide transition-colors ${
                    active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button size="sm" render={<Link href="/listings/new" />}>
                  <Plus className="h-4 w-4 mr-1" />
                  List a Coin
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                    }
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/want-list')}>
                      Want List
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
                <Button variant="ghost" size="sm" render={<Link href="/auth/login" />}>
                  Sign In
                </Button>
                <Button size="sm" render={<Link href="/auth/register" />}>
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
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-3 py-3 space-y-1">
          {[
            { href: '/', label: 'Home' },
            { href: '/listings', label: 'Browse' },
            { href: '/listings/new', label: 'Sell' },
            { href: '/collect', label: 'Collect' },
            ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
          ].map(({ href, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-base font-semibold tracking-wide transition-colors ${
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            )
          })}
          {user ? (
            <button onClick={signOut} className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-destructive">
              Sign Out
            </button>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" render={<Link href="/auth/login" />}>Sign In</Button>
              <Button size="sm" render={<Link href="/auth/register" />}>Get Started</Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
