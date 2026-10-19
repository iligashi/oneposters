'use client'

import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { springs } from '@/lib/motion'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const applyTheme = (isDark: boolean) => {
    const root = document.documentElement
    root.dataset.theme = isDark ? 'dark' : 'light'
    const vars = isDark ? { cream: '#0B0B0B', ink: '#F5EFE6', blue: '#0A14FF', muted: '#B6B0A7', line: '#343434' } : { cream: '#F5EFE6', ink: '#0B0B0B', blue: '#0A14FF', muted: '#716D67', line: '#D8D1C7' }
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(`--${name}`, value))
  }
  useEffect(() => {
    const saved = localStorage.getItem('oneposters-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefersDark
    applyTheme(isDark)
    setDark(isDark)
  }, [])
  function toggle() { const next = !dark; setDark(next); applyTheme(next); localStorage.setItem('oneposters-theme', next ? 'dark' : 'light') }
  return <button className="theme-toggle" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun /> : <Moon />}</button>
}

export function VisualEnhancements() {
  const reduceMotion = useReducedMotion()
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const x = useSpring(cursorX, springs.magnetic)
  const y = useSpring(cursorY, springs.magnetic)
  const [label, setLabel] = useState('')
  useEffect(() => { if (reduceMotion) return; const move = (event: MouseEvent) => { cursorX.set(event.clientX); cursorY.set(event.clientY) }; window.addEventListener('mousemove', move); const posters = Array.from(document.querySelectorAll('.poster-card')); const enter = () => setLabel('View'); const leave = () => setLabel(''); posters.forEach((poster) => { poster.addEventListener('mouseenter', enter); poster.addEventListener('mouseleave', leave) }); return () => { window.removeEventListener('mousemove', move); posters.forEach((poster) => { poster.removeEventListener('mouseenter', enter); poster.removeEventListener('mouseleave', leave) }) } }, [cursorX, cursorY, reduceMotion])
  return <motion.div className={`custom-cursor ${label ? 'is-view' : ''}`} style={{ x, y }} aria-hidden="true" onMouseEnter={() => setLabel('View')} onMouseLeave={() => setLabel('')}>{label}</motion.div>
}
