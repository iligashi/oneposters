import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle()
  if (profile?.role && ['owner', 'manager', 'support'].includes(profile.role)) redirect('/admin')
  return <main className="account-page"><div className="account-card"><p className="kicker">Your oneposters</p><h1>{profile?.full_name || user.email?.split('@')[0] || 'Account'}.</h1><p>{user.email}</p><div className="account-links"><a className="blue-button" href="/shop">Shop posters</a><a className="outline-button" href="/studio">Open studio</a></div><p className="account-role">{profile?.role === 'customer' ? 'Customer account' : profile?.role}</p></div></main>
}
