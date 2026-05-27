'use client'

import { useEffect } from 'react'
import { getOrCreateUserKeyPair } from '@/lib/e2e-crypto'
import { createClient } from '@/lib/supabase/client'

// Silently generates and uploads the user's RSA public key if they don't have one yet.
// This ensures messaging works immediately for any user without them needing to initiate a conversation first.
export function KeyInitializer() {
  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Check if key already stored on profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('public_key')
          .eq('id', user.id)
          .single()

        if (profile?.public_key) return

        const { publicKeyJwk } = await getOrCreateUserKeyPair()
        await supabase
          .from('profiles')
          .update({ public_key: JSON.stringify(publicKeyJwk) })
          .eq('id', user.id)
      } catch {
        // Non-critical; silently fail
      }
    }
    init()
  }, [])

  return null
}
