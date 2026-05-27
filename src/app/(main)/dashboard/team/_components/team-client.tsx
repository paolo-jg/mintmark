'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Mail, Trash2, Loader2, UserPlus, ShieldCheck, User, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  profiles: { display_name: string | null; email: string } | null
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

interface TeamData {
  isDealer: boolean
  members: TeamMember[]
  pendingInvites: PendingInvite[]
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

async function fetchTeamData(): Promise<TeamData> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { isDealer: false, members: [], pendingInvites: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', session.user.id)
    .single()

  if (profile?.subscription_tier !== 'dealer') {
    return { isDealer: false, members: [], pendingInvites: [] }
  }

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('team_members')
      .select('id, user_id, role, joined_at, profiles!user_id(display_name, email)')
      .eq('dealer_id', session.user.id)
      .order('joined_at', { ascending: false }),
    supabase
      .from('team_invites')
      .select('id, email, role, expires_at, created_at')
      .eq('dealer_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return {
    isDealer: true,
    members: (members ?? []) as unknown as TeamMember[],
    pendingInvites: (invites ?? []) as PendingInvite[],
  }
}

// ── Invite form ────────────────────────────────────────────────────────────────

function InviteForm({ onInvited }: { onInvited: (invite: PendingInvite) => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to send invite')
      toast.success(`Invite sent to ${email}`)
      onInvited({ id: json.id, email: email.trim(), role, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), created_at: new Date().toISOString() })
      setEmail('')
      setRole('member')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
      <div className="flex-1 min-w-52">
        <label className="block text-xs font-semibold mb-1.5">Email address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5">Role</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value as 'member' | 'admin')}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button type="submit" disabled={sending || !email.trim()}>
        {sending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <><UserPlus className="h-4 w-4 mr-1.5" /> Send Invite</>}
      </Button>
    </form>
  )
}

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return role === 'admin'
    ? <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Admin</Badge>
    : <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1"><User className="h-2.5 w-2.5" /> Member</Badge>
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TeamClient() {
  const { data, isLoading, mutate } = useSWR('team-data', fetchTeamData, { keepPreviousData: true })
  const [removing, setRemoving] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function handleRemoveMember(memberId: string) {
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove member')
      toast.success('Member removed')
      mutate()
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setRemoving(null)
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    setRevoking(inviteId)
    try {
      const res = await fetch(`/api/team/invite/${inviteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke invite')
      toast.success('Invite revoked')
      mutate()
    } catch {
      toast.error('Failed to revoke invite')
    } finally {
      setRevoking(null)
    }
  }

  function handleInvited(invite: PendingInvite) {
    mutate(prev => prev ? {
      ...prev,
      pendingInvites: [invite, ...prev.pendingInvites],
    } : prev, false)
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
        <div className="h-7 w-40 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    )
  }

  if (!data?.isDealer) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Team management is only available on Dealer accounts.
          </p>
        </div>
      </div>
    )
  }

  const { members, pendingInvites } = data

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite staff to manage listings and orders on your behalf.
        </p>
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border bg-card px-4 py-3.5 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <User className="h-3.5 w-3.5 text-muted-foreground" /> Member
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Can create and manage listings, view orders.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3.5 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Admin
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Everything a Member can do, plus invite and remove team members.
          </p>
        </div>
      </div>

      {/* Invite form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite a Team Member</CardTitle>
          <CardDescription>They'll receive an email with a link to accept the invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm onInvited={handleInvited} />
        </CardContent>
      </Card>

      {/* Current members */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Current Members
          {members.length > 0 && <span className="text-muted-foreground font-normal">({members.length})</span>}
        </h2>

        {members.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <Users className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No team members yet</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {members.map(member => {
              const name = member.profiles?.display_name ?? member.profiles?.email ?? 'Unknown'
              const email = member.profiles?.email
              return (
                <div key={member.id} className="flex items-center justify-between px-4 py-3.5 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      {email && email !== name && (
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <RoleBadge role={member.role} />
                    <p className="text-[11px] text-muted-foreground hidden sm:block">
                      Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                    </p>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removing === member.id}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors"
                      title="Remove member"
                    >
                      {removing === member.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Pending Invites
            <span className="text-muted-foreground font-normal">({pendingInvites.length})</span>
          </h2>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between px-4 py-3.5 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <RoleBadge role={invite.role} />
                  <button
                    onClick={() => handleRevokeInvite(invite.id)}
                    disabled={revoking === invite.id}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors"
                    title="Revoke invite"
                  >
                    {revoking === invite.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
