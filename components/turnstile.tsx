'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void }) => string
      remove: (id: string) => void
    }
  }
}

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** Cloudflare Turnstile bot check. Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!turnstileSiteKey || !ref.current) return
    let widgetId: string | undefined
    let cancelled = false
    function render() {
      if (cancelled || !ref.current || !window.turnstile) return
      widgetId = window.turnstile.render(ref.current, { sitekey: turnstileSiteKey, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') })
    }
    if (window.turnstile) render()
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
      if (!script) { script = document.createElement('script'); script.src = SCRIPT_SRC; script.async = true; document.head.appendChild(script) }
      script.addEventListener('load', render)
    }
    return () => { cancelled = true; if (widgetId && window.turnstile) window.turnstile.remove(widgetId) }
  }, [onToken])
  if (!turnstileSiteKey) return null
  return <div ref={ref} style={{ margin: '12px 0' }} />
}
