import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses row-level security, so it must only be
 * imported from server code (route handlers, server components) and only used
 * after the request has been validated.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') throw new Error('createAdminClient must not run in the browser')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase service credentials are not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
