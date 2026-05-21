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
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <Coins className="h-5 w-5" />
            Mintmark
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/listings" className="text-muted-foreground hover:text-foreground transition-colors">
              Browse
            </Link>
            <Link href="/auctions" className="text-muted-foreground hover:text-foreground transition-colors">
              Auctions
            </Link>
            {user && (
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
            )}
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
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          <Link href="/listings" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Browse</Link>
          <Link href="/auctions" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Auctions</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href="/listings/new" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>List a Coin</Link>
              <button onClick={signOut} className="block text-sm text-destructive">Sign Out</button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" render={<Link href="/auth/login" />}>Sign In</Button>
              <Button size="sm" render={<Link href="/auth/register" />}>Get Started</Button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
