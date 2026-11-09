'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../../auth/auth.module.css'

type Enrollment = { factorId: string; qr: string; secret: string }

export default function MfaForm({ email }: { email: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (cancelled) return
      if (error) { setMessage('Could not load two-factor settings.'); setBusy(false); return }
      const verified = data.totp.find((factor: { id: string; status: string }) => factor.status === 'verified')
      if (verified) { setFactorId(verified.id); setBusy(false); return }
      // Remove abandoned, unverified factors before starting a fresh enrollment.
      for (const factor of data.all.filter((f: { id: string; status: string }) => f.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: factor.id })
      const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `oneposters admin ${new Date().toISOString().slice(0, 10)}` })
      if (cancelled) return
      if (enrolled.error) setMessage('Two-factor setup is unavailable. Enable TOTP MFA in Supabase Auth settings.')
      else { setEnrollment({ factorId: enrolled.data.id, qr: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret }); setFactorId(enrolled.data.id) }
      setBusy(false)
    }
    load()
    return () => { cancelled = true }
  }, [supabase])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!factorId) return
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s+/g, '') })
    if (error) { setMessage('That code did not work. Check your authenticator app and try again.'); setBusy(false); return }
    window.location.href = '/admin'
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return <main className={styles.page}><div className={styles.card}>
    <p className="kicker">Admin security</p>
    <h1>{enrollment ? 'Set up 2FA.' : 'Verify it’s you.'}</h1>
    <p>{enrollment
      ? `Staff accounts need two-factor authentication. Scan this code with an authenticator app (1Password, Google Authenticator, Authy), then enter the 6-digit code for ${email}.`
      : 'Enter the 6-digit code from your authenticator app to open the admin workspace.'}</p>
    {enrollment && <>
      <img src={enrollment.qr} alt="Two-factor QR code" width={180} height={180} style={{ background: '#fff', padding: 8 }} />
      <p><small>Can’t scan? Enter this key: <code style={{ wordBreak: 'break-all' }}>{enrollment.secret}</code></small></p>
    </>}
    <form onSubmit={submit}>
      <label>Authentication code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={e => setCode(e.target.value)} disabled={busy || !factorId} /></label>
      {message && <p role="alert" className={styles.message}>{message}</p>}
      <button className={`blue-button ${styles.button}`} type="submit" disabled={busy || !factorId}>{busy ? 'Please wait…' : 'Verify'}</button>
    </form>
    <p className={styles.switch}><button type="button" onClick={signOut} style={{ border: 0, background: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Sign out</button></p>
  </div></main>
}
