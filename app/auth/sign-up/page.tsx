'use client'

import { FormEvent, useCallback, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Turnstile, turnstileSiteKey } from '@/components/turnstile'
import styles from '../auth.module.css'

const MIN_PASSWORD = 10

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [busy, setBusy] = useState(false)
  const onToken = useCallback((token: string) => setCaptchaToken(token), [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (password.length < MIN_PASSWORD) { setMessage(`Use at least ${MIN_PASSWORD} characters.`); return }
    if (turnstileSiteKey && !captchaToken) { setMessage('Please complete the security check.'); return }
    setBusy(true)
    const { error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })
    setBusy(false)
    setMessage(error ? (error.message.toLowerCase().includes('password') ? 'Choose a stronger password.' : 'We could not create that account.') : 'Check your email to confirm your account.')
  }

  return <main className={styles.page}><div className={styles.card}>
    <Link href="/" className={`${styles.logo} store-logo`}><span>one</span><small>posters</small></Link>
    <p className="kicker">Join the club</p><h1>Make it yours.</h1>
    <form onSubmit={submit}>
      <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" required minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
      <Turnstile onToken={onToken} />
      {message && <p role="status" className={styles.message}>{message}</p>}
      <button className={`blue-button ${styles.button}`} type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className={styles.switch}>Already have an account? <Link href="/auth/login">Sign in</Link></p>
  </div></main>
}
