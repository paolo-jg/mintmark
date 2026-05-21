import { NextRequest, NextResponse } from 'next/server'
import { lookupCert } from '@/lib/grading'
import { createClient } from '@/lib/supabase/server'
import type { GradingService } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service') as GradingService | null
  const certNumber = searchParams.get('certNumber')

  if (!service || !certNumber) {
    return NextResponse.json({ error: 'service and certNumber are required' }, { status: 400 })
  }

  const result = await lookupCert(service, certNumber.trim())
  return NextResponse.json(result)
}
