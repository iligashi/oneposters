import { redirect } from 'next/navigation'
import { checkStaff } from '@/lib/staff'
import MfaForm from './mfa-form'

export const dynamic = 'force-dynamic'

export default async function AdminMfaPage() {
  const staff = await checkStaff()
  if (staff.status === 'ok') redirect('/admin')
  if (staff.status === 'signed-out') redirect('/auth/login?next=/admin')
  if (staff.status !== 'mfa-required') redirect('/account')
  return <MfaForm email={staff.profile?.email ?? ''} />
}
