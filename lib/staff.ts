import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type StaffRole = 'owner' | 'manager' | 'support'
export const STAFF_ROLES: StaffRole[] = ['owner', 'manager', 'support']
export const EDITOR_ROLES: StaffRole[] = ['owner', 'manager']

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
export type StaffProfile = { id: string; full_name: string | null; email: string | null; role: StaffRole }

export type StaffCheck =
  | { status: 'ok'; supabase: SupabaseServerClient; profile: StaffProfile }
  | { status: 'signed-out' | 'forbidden' | 'mfa-required'; supabase: SupabaseServerClient; profile?: StaffProfile }

/**
 * Loads the signed-in user's staff profile and checks the allowed roles and
 * that the session has passed two-factor authentication (aal2).
 */
export async function checkStaff(allowed: StaffRole[] = STAFF_ROLES): Promise<StaffCheck> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'signed-out', supabase }

  const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('id', user.id).maybeSingle()
  const profile = data as StaffProfile | null
  if (!profile || !STAFF_ROLES.includes(profile.role)) return { status: 'forbidden', supabase }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2') return { status: 'mfa-required', supabase, profile }

  if (!allowed.includes(profile.role)) return { status: 'forbidden', supabase, profile }
  return { status: 'ok', supabase, profile }
}

/** Route-handler variant: returns a JSON error response when the check fails. */
export async function requireStaffApi(allowed: StaffRole[] = STAFF_ROLES) {
  const result = await checkStaff(allowed)
  if (result.status === 'ok') return { ok: true as const, supabase: result.supabase, profile: result.profile }
  const response = result.status === 'signed-out'
    ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    : result.status === 'mfa-required'
      ? NextResponse.json({ error: 'Two-factor authentication required' }, { status: 403 })
      : NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { ok: false as const, response }
}
