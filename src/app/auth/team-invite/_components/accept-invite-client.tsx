'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Store, ShieldCheck, User, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  token: string
  dealerName: string
  dealerLogoUrl: string | null
  role: string
  isLoggedIn: boolean
}

export function AcceptInviteClient({ token, dealerName, dealerLogoUrl, role, isLoggedIn }: Props) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const encodedNext = encodeURIComponent(`/auth/team-invite?token=${token}`)

  async function handleAccept() {
    setAccepting(true)
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to accept invite')
      setAccepted(true)
      toast.success(`You've joined ${dealerName}'s team!`)
      setTimeout(() => router.push('/sell'), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  if (accepted) {
    return (
      <div className="max-w-sm w-full text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="text-lg font-semibold">You're in!</p>
        <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
      </div>
    )
  }

  return (
    <div className="max-w-sm w-full space-y-6">

      {/* Dealer identity */}
      <div className="text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-muted border border-border overflow-hidden flex items-center justify-center mx-auto">
          {dealerLogoUrl
            ? <img src={dealerLogoUrl} alt={dealerName} className="h-full w-full object-cover" />
            : <Store className="h-7 w-7 text-muted-foreground/40" />}
        </div>
        <div>
          <h1 className="text-xl font-bold">You've been invited</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{dealerName}</span> has invited you to join their team on Pedigree Coins.
          </p>
        </div>
      </div>

      {/* Role card */}
      <div className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-center gap-3">
        {role === 'admin'
          ? <ShieldCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          : <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
        <div>
          <p className="text-sm font-semibold capitalize">{role}</p>
          <p className="text-xs text-muted-foreground">
            {role === 'admin'
              ? 'Manage listings, orders, and team members.'
              : 'Create and manage listings, view orders.'}
          </p>
        </div>
      </div>

      {/* CTA */}
      {isLoggedIn ? (
        <Button className="w-full" size="lg" onClick={handleAccept} disabled={accepting}>
          {accepting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : `Accept & Join ${dealerName}`}
        </Button>
      ) : (
        <div className="space-y-3">
          <Button className="w-full" size="lg" render={<Link href={`/auth/login?next=${encodedNext}`} />}>
            Log in to Accept
          </Button>
          <Button variant="outline" className="w-full" size="lg" render={<Link href={`/auth/register?next=${encodedNext}`} />}>
            Create an Account
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            After logging in or creating an account, you'll be brought back here to accept.
          </p>
        </div>
      )}
    </div>
  )
}
