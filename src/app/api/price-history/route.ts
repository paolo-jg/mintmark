import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const coin_name = searchParams.get('coin_name')
  const year = searchParams.get('year')
  const mint_mark = searchParams.get('mint_mark')
  const grade = searchParams.get('grade')
  const series_slug = searchParams.get('series_slug')

  if (!grade || (!coin_name && !series_slug)) {
    return NextResponse.json({ data: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: [] })

  let query = supabase
    .from('price_history')
    .select('sale_price, sale_date, listing_id')
    .eq('grade', grade)
    .order('sale_date', { ascending: true })
    .limit(200)

  if (series_slug) {
    query = query.eq('series_slug', series_slug)
  } else if (coin_name) {
    query = query.eq('coin_name', coin_name)
  }

  if (year) query = query.eq('year', Number(year))
  if (mint_mark) query = query.eq('mint_mark', mint_mark)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: [] })

  return NextResponse.json({ data: data ?? [] })
}
