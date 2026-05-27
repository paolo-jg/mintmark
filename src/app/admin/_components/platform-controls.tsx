'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  initialSettings: Record<string, unknown>
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 disabled:opacity-50 ${
        checked ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function PlatformControls({ initialSettings }: Props) {
  const [paused, setPaused] = useState<boolean>(initialSettings.platform_paused === true)
  const [registrations, setRegistrations] = useState<boolean>(initialSettings.new_registrations_enabled !== false)
  const [message, setMessage] = useState<string>(
    typeof initialSettings.maintenance_message === 'string'
      ? initialSettings.maintenance_message
      : 'The platform is temporarily unavailable. Please check back soon.'
  )
  const [saving, setSaving] = useState(false)

  async function save(patch: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/platform', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function togglePaused(val: boolean) {
    setPaused(val)
    await save({ platform_paused: val })
  }

  async function toggleRegistrations(val: boolean) {
    setRegistrations(val)
    await save({ new_registrations_enabled: val })
  }

  async function saveMessage() {
    await save({ maintenance_message: message })
  }

  return (
    <div className="space-y-4">
      {/* Platform pause */}
      <div className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 ${paused ? 'border-red-300 dark:border-red-800' : 'border-zinc-200 dark:border-zinc-800'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pause Platform</p>
            <p className="text-sm text-zinc-500 mt-0.5">
              When paused, all users see the maintenance message and cannot transact. Admin access is unaffected.
            </p>
            {paused && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-2">Platform is currently paused.</p>
            )}
          </div>
          <Toggle checked={paused} onChange={togglePaused} disabled={saving} />
        </div>
      </div>

      {/* Maintenance message */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Maintenance Message</p>
        <p className="text-sm text-zinc-500 mb-3">Shown to users when the platform is paused.</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          className="w-full text-sm px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
        />
        <button
          onClick={saveMessage}
          disabled={saving}
          className="mt-2 h-8 px-4 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
        >
          Save Message
        </button>
      </div>

      {/* New registrations */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Allow New Registrations</p>
            <p className="text-sm text-zinc-500 mt-0.5">When off, new signups are blocked. Existing users can still log in.</p>
          </div>
          <Toggle checked={registrations} onChange={toggleRegistrations} disabled={saving} />
        </div>
      </div>
    </div>
  )
}
