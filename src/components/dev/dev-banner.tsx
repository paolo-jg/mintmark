'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, X, FlaskConical } from 'lucide-react'

export function DevBanner() {
  if (process.env.NODE_ENV !== 'development') return null

  return <DevBannerInner />
}

function DevBannerInner() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const signIn = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <>
      {/* Floating pill */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-semibold px-3 py-2 rounded-full shadow-lg transition-colors"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Dev login
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Dev bypass login</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => e.key === 'Enter' && signIn()}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <button
                onClick={signIn}
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
