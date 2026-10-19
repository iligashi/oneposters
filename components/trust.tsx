'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Leaf, Package, RotateCcw, Sparkles, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const benefits = [
  { icon: Sparkles, title: 'Printed in our studio', copy: 'Made to order, never mass-produced.' },
  { icon: Leaf, title: 'Premium matte paper', copy: 'Archival paper with a soft finish.' },
  { icon: Package, title: 'Delivery in 2 to 7 business days', copy: 'Carefully packed and tracked.' },
  { icon: RotateCcw, title: '30-day returns', copy: 'Take your time finding the right wall.' },
]

const reviews = [
  ['The quality is genuinely beautiful. Soft Geometry made our hallway feel finished.', 'Mara T. · Berlin'],
  ['Fast delivery, lovely paper, and the blue is even better in person.', 'Jonas R. · Copenhagen'],
  ['It feels like a small gallery piece without the gallery price tag.', 'Elena K. · Amsterdam'],
  ['The perfect gift for someone who is impossible to shop for.', 'Nina S. · London'],
]

export function TrustStrip() {
  const reduceMotion = useReducedMotion()
  return <section className="trust-strip" aria-label="Why oneposters">{benefits.map(({ icon: Icon, title, copy }, index) => <motion.article key={title} initial={reduceMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .5 }} transition={{ delay: index * .08 }}><Icon aria-hidden="true" /><div><strong>{title}</strong><p>{copy}</p></div></motion.article>)}</section>
}

export function Reviews() {
  return <section className="reviews-section" aria-labelledby="reviews-heading"><div className="section-topline"><div><p className="kicker">People with good walls</p><h2 id="reviews-heading">Loved by <i>4.9 / 5.</i></h2></div><span className="review-note">Based on 240+ studio orders</span></div><div className="reviews-marquee"><div className="reviews-track">{[...reviews, ...reviews].map(([copy, author], index) => <article className="review-card" key={`${author}-${index}`}><div className="stars" aria-label="5 out of 5 stars">★★★★★</div><p>“{copy}”</p><small>{author}</small></article>)}</div></div><p className="trustpilot-todo">TODO: connect verified Trustpilot reviews before launch.</p></section>
}

export function SocialProofToast() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => { if (sessionStorage.getItem('oneposters-proof-dismissed')) return; const timer = window.setTimeout(() => setVisible(true), 5500); return () => window.clearTimeout(timer) }, [])
  useEffect(() => { if (!visible || dismissed) return; const timer = window.setTimeout(() => setVisible(false), 6500); return () => window.clearTimeout(timer) }, [visible, dismissed])
  function dismiss() { setVisible(false); setDismissed(true); sessionStorage.setItem('oneposters-proof-dismissed', '1') }
  return <AnimatePresence>{visible && <motion.div className="proof-toast" initial={{ opacity: 0, y: 20, x: 20 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, y: 20 }}><span className="proof-dot" /><p>Someone in Berlin just ordered <strong>Soft Geometry</strong></p><button onClick={dismiss} aria-label="Dismiss notification"><X /></button></motion.div>}</AnimatePresence>
}

export function NewsletterPopup() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  useEffect(() => { if (localStorage.getItem('oneposters-newsletter-seen')) return; const onMouse = (event: MouseEvent) => { if (event.clientY <= 8) { setOpen(true); localStorage.setItem('oneposters-newsletter-seen', '1') } }; const onScroll = () => { if (window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) > .4 && window.innerWidth < 801) { setOpen(true); localStorage.setItem('oneposters-newsletter-seen', '1') } }; document.addEventListener('mouseout', onMouse); window.addEventListener('scroll', onScroll, { passive: true }); return () => { document.removeEventListener('mouseout', onMouse); window.removeEventListener('scroll', onScroll) } }, [])
  function submit(event: FormEvent) { event.preventDefault(); if (email) setSuccess(true) }
  return <AnimatePresence>{open && <motion.div className="newsletter-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="newsletter-popup" initial={{ opacity: 0, scale: .94, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }}><button className="newsletter-close" onClick={() => setOpen(false)} aria-label="Close newsletter offer"><X /></button>{success ? <div className="newsletter-success"><Check /><h2>You&apos;re in.</h2><p>Your 10% code is on its way to your inbox.</p></div> : <><p className="kicker">A little something for your wall</p><h2>Take 10% off<br /><i>your first order.</i></h2><p>New drops, studio notes and the good stuff. No noise.</p><form onSubmit={submit}><input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="Your email address" aria-label="Email address" /><button className="blue-button">Get my code <ArrowRight /></button></form><small>By subscribing, you agree to receive oneposters emails.</small></>}</motion.div></motion.div>}</AnimatePresence>
}
