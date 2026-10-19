'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    const { error } = await createClient().auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setMessage(error ? (error.message.toLowerCase().includes('password') ? 'Choose a stronger password.' : 'We could not create that account.') : 'Check your email to confirm your account.')
  }
  return <main className={styles.page}><div className={styles.card}><Link href="/" className={`${styles.logo} store-logo`}><span>one</span><small>posters</small></Link><p className="kicker">Join the club</p><h1>Make it yours.</h1><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>{message && <p role="status" className={styles.message}>{message}</p>}<button className={`blue-button ${styles.button}`} type="submit">Create account</button></form><p className={styles.switch}>Already have an account? <Link href="/auth/login">Sign in</Link></p></div></main>
}
