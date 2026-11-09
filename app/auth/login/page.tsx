'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeNextPath } from '@/lib/redirect'
import styles from '../auth.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setBusy(true)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'Invalid email or password.')
      setBusy(false)
      return
    }
    // Full navigation so server components (admin checks) see the new session cookie.
    window.location.href = safeNextPath(new URLSearchParams(window.location.search).get('next'), '/account')
  }

  return <main className={styles.page}><div className={styles.card}>
    <Link href="/" className={`${styles.logo} store-logo`}><span>one</span><small>posters</small></Link>
    <p className="kicker">Welcome back</p><h1>Sign in.</h1>
    <form onSubmit={submit}>
      <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {message && <p role="alert" className={styles.message}>{message}</p>}
      <button className={`blue-button ${styles.button}`} type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className={styles.switch}>New here? <Link href="/auth/sign-up">Create an account</Link></p>
  </div></main>
}
