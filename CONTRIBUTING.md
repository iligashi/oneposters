# Contributing

## Workflow

1. Branch from an up-to-date `main`. Never commit directly to `main`.
2. Make focused changes. One pull request should do one thing.
3. Run the checks locally before pushing:
   ```bash
   pnpm typecheck && pnpm test && pnpm build
   ```
4. Open a pull request using the template, and wait for CI to pass and for a review.
5. Merge with **squash and merge**. The branch is deleted automatically.

## Branch names

`<type>/<short-description>`, for example `feat/wishlist-sharing`, `fix/checkout-promo-rounding`,
`chore/upgrade-next`.

| Type | Use for |
|---|---|
| `feat` | New user-facing behaviour |
| `fix` | Bug fixes |
| `chore` | Tooling, dependencies, repository housekeeping |
| `docs` | Documentation only |
| `refactor` | Code changes that don't change behaviour |
| `test` | Tests only |

## Commit messages

- Imperative mood, at most about 72 characters: `Fix promo code rounding at checkout`.
- Add a body when the *why* isn't obvious from the diff.
- Reference issues with `Fixes #123` so they close on merge.

## Database changes

- Every schema, policy or function change is a new file in `supabase/migrations/`, named
  `YYYYMMDDHHMMSS_short_description.sql`. Never edit a migration that has already been applied anywhere.
- Migrations must be safe to run more than once (`if not exists`, `create or replace`) and wrapped in
  `begin; ... commit;`.
- Apply the migration to production **before** merging code that depends on it, and say so in the PR.
- Never weaken row-level security without an explicit note in the PR description.

## Code guidelines

- TypeScript strict mode. Avoid `any` in new code.
- Prices are integer cents end to end. The server always recomputes totals; never trust client prices.
- Mutating API routes must check the same origin, rate-limit public endpoints, and check staff roles with
  `requireStaffApi` for admin endpoints.
- Secrets live only in environment variables. Add every new variable to `.env.example` with a comment.
- Add or update unit tests in `tests/` for pricing, order, validation and security logic.

## Dependencies

Dependabot opens weekly grouped update PRs. Review the changelog for major versions, and merge only when CI passes.
