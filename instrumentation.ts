import type { Instrumentation } from 'next'

/**
 * Server error monitoring. Every unhandled error in a route, server component or
 * route handler is logged as one structured JSON line (searchable in Vercel logs).
 * Set ERROR_WEBHOOK_URL to also POST each error to an alerting endpoint
 * (Slack/Discord incoming webhook, Better Stack, etc.).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string }
  const event = {
    level: 'error',
    service: 'oneposters',
    message: err?.message ?? String(error),
    digest: err?.digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    time: new Date().toISOString(),
  }
  console.error(JSON.stringify({ ...event, stack: err?.stack }))

  const webhook = process.env.ERROR_WEBHOOK_URL
  if (!webhook) return
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `[oneposters] ${event.method} ${event.path}: ${event.message}`, ...event }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Never let alerting failures affect the request.
  }
}
