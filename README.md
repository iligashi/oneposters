# oneposters

Online poster shop with a custom-print studio and a staff admin.
Live at **[oneposters.vercel.app](https://oneposters.vercel.app)**.

[![CI](https://github.com/iligashi/oneposters/actions/workflows/ci.yml/badge.svg)](https://github.com/iligashi/oneposters/actions/workflows/ci.yml)

## What it does

| Area | Path | Notes |
|---|---|---|
| Storefront | `/`, `/shop`, `/product/[slug]`, `/wishlist` | Published catalog from Supabase, built-in sample posters as a fallback |
| Studio | `/studio` | Customers upload artwork and preview it in a room mockup; signed-in users only |
| Checkout | `/checkout` | Server-priced orders written atomically by `create_order()`; payment arranged manually (no Stripe yet) |
| Account | `/account`, `/auth/*` | Supabase Auth (email + password) |
| Admin | `/admin` | Products, sizes, images, orders, customers, studio queue, discounts, staff, content, audit log. Staff roles + mandatory TOTP 2FA |

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) · React 19 · TypeScript
- [Supabase](https://supabase.com): Postgres with row-level security, Auth, TOTP MFA
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob): product images and studio uploads
- Tailwind CSS 4 + CSS modules · zustand · SWR · framer-motion
- Vitest for unit tests · GitHub Actions CI · deployed on Vercel

## Getting started

Requirements: **Node.js 24** (see `.nvmrc`) and **pnpm** (version pinned in `package.json`, enabled through Corepack).

```bash
corepack enable
pnpm install
cp .env.example .env.local   # or: vercel env pull .env.local
pnpm dev                     # http://localhost:3000
```

Fill in `.env.local`. Every variable is documented in [`.env.example`](.env.example). The minimum for a working
storefront is the Supabase URL and anon key. Checkout also needs `SUPABASE_SERVICE_ROLE_KEY`, and uploads need
`BLOB_READ_WRITE_TOKEN`.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / serve it |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest) |

CI runs typecheck, tests and a production build on every pull request.

## Database

Schema changes live in [`supabase/migrations`](supabase/migrations) and must be applied **before** the code that
depends on them is deployed. See [`supabase/README.md`](supabase/README.md) for how to apply migrations, the security
model (who can read and write what), and how to bootstrap the first owner account.

## Project layout

```
app/                 Routes (App Router)
  admin/             Staff dashboard; sections/ holds one module per admin page
  api/               Route handlers: orders, promo, studio uploads, admin CRUD, health
components/          Shared storefront components
lib/                 Domain logic: pricing, orders, catalog, security, staff checks, Supabase clients
data/                Built-in sample catalog (fallback when the database is empty)
supabase/            Migrations and database documentation
tests/               Vitest unit tests
middleware.ts        Supabase session refresh
instrumentation.ts   Server error reporting
```

## Deployment

Pushing to `main` deploys to production on Vercel; every pull request gets a preview deployment.
Environment variables are managed in the Vercel project settings. Apply any new migrations before merging.

## Contributing and security

- Workflow, branch naming and commit conventions: [CONTRIBUTING.md](CONTRIBUTING.md)
- Reporting a vulnerability: [SECURITY.md](SECURITY.md). Please do not open a public issue.

## License

Proprietary. Copyright © oneposters. All rights reserved. No permission is granted to use, copy, modify or
distribute this code without written permission.
