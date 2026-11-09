/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production'
const supabaseOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').origin } catch { return 'https://*.supabase.co' }
})()

// Next.js injects inline bootstrap scripts, so script-src keeps 'unsafe-inline'.
// The policy still blocks third-party script hosts, plugins, framing and form posts elsewhere.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.live`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace('https://', 'wss://')} https://vitals.vercel-insights.com https://vercel.live wss://ws-us3.pusher.com${isDev ? ' ws: http://localhost:*' : ''}`,
  'frame-src https://challenges.cloudflare.com https://vercel.live',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const nextConfig = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ],
    }, {
      source: '/(admin|account|api)/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    }]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
