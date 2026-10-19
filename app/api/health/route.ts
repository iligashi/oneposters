import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { error } = await supabase.from('site_content').select('key').limit(1)
  return NextResponse.json({ ok: !error, service: 'oneposters', database: error ? 'error' : 'ok' }, { status: error ? 503 : 200 })
}
