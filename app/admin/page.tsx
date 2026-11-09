import { redirect } from 'next/navigation'
import { checkStaff } from '@/lib/staff'
import AdminDashboard from './admin-dashboard'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const staff = await checkStaff()
  if (staff.status === 'signed-out') redirect('/auth/login?next=/admin')
  if (staff.status === 'mfa-required') redirect('/admin/mfa')
  if (staff.status !== 'ok') redirect('/account')
  return <AdminDashboard user={staff.profile} />
}
