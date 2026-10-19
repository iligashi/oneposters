import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from './admin-dashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/admin')
  const { data: profile } = await supabase.from('profiles').select('full_name,email,role').eq('id', user.id).maybeSingle()
  if (!profile || !['owner', 'manager', 'support'].includes(profile.role)) redirect('/account')
  return <AdminDashboard user={profile} />
}
