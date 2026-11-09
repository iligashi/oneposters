## What and why
<!-- What does this change do, and why is it needed? Link issues with "Fixes #123". -->

## How to test
<!-- Steps a reviewer can follow, or what you verified. -->

## Checklist
- [ ] `pnpm typecheck`, `pnpm test` and `pnpm build` pass locally
- [ ] Tests added or updated for changed pricing, order, validation or security logic
- [ ] New environment variables are documented in `.env.example` and set in Vercel
- [ ] Database: no migration, **or** the new migration is in `supabase/migrations/` and has been applied before merging
- [ ] Row-level security is not weakened (or the reason is explained above)
- [ ] UI changes checked on mobile and desktop (screenshots below if relevant)
