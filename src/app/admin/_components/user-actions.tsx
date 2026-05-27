'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  username: string
  suspended: boolean
  suspended_reason?: string | null
  is_admin: boolean
}

export default function UserActions({ user }: { user: User }) {
  const [loading, setLoading] = useState(false)
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState('')

  async function suspend() {
    if (!reason.trim()) { toast.error('Please enter a reason'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: true, suspended_reason: reason }),
      })
      if (!res.ok) throw new Error()
      toast.success('User suspended')
      setShowReason(false)
      setReason('')
      window.location.reload()
    } catch {
      toast.error('Failed to suspend user')
    } finally {
      setLoading(false)
    }
  }

  async function unsuspend() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: false }),
      })
      if (!res.ok) throw new Error()
      toast.success('User unsuspended')
      window.location.reload()
    } catch {
      toast.error('Failed to unsuspend user')
    } finally {
      setLoading(false)
    }
  }

  if (showReason) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason..."
          className="h-7 px-2 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 w-36"
          autoFocus
        />
        <button
          onClick={suspend}
          disabled={loading}
          className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => { setShowReason(false); setReason('') }}
          className="text-xs px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {user.suspended ? (
        <button
          onClick={unsuspend}
          disabled={loading}
          className="text-xs px-2.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
        >
          Unsuspend
        </button>
      ) : (
        <button
          onClick={() => setShowReason(true)}
          className="text-xs px-2.5 py-1 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
        >
          Suspend
        </button>
      )}
    </div>
  )
}
