'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { setMessage(error.message.toLowerCase().includes('confirm') ? 'Please confirm your email before signing in.' : 'Invalid email or password.'); return }
    router.push('/account')
    router.refresh()
  }
  return <main className={styles.page}><div className={styles.card}><Link href="/" className={`${styles.logo} store-logo`}><span>one</span><small>posters</small></Link><p className="kicker">Welcome back</p><h1>Sign in.</h1><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{message && <p role="alert" className={styles.message}>{message}</p>}<button className={`blue-button ${styles.button}`} type="submit">Sign in</button></form><p className={styles.switch}>New here? <Link href="/auth/sign-up">Create an account</Link></p></div></main>
}
