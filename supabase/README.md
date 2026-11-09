# Database

The Supabase schema lives in `supabase/migrations`. Apply migrations **before**
deploying code that depends on them.

## Applying migrations

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or open Supabase Dashboard → SQL editor, paste a migration file and run it.

## Capturing the existing schema (one-time)

The tables were originally created in the dashboard, so the base schema is not in
this repo yet. Capture it so the database can be reviewed and rebuilt:

```bash
npx supabase db dump --schema public -f supabase/schema.sql
```

Commit `supabase/schema.sql`. Future changes should be new files in
`supabase/migrations/` rather than dashboard edits.

## Security model (after `20261109120000_security_hardening.sql`)

| Data | Public (anon) | Customer | Support | Manager | Owner |
|---|---|---|---|---|---|
| Published products, sizes, images, categories, options, site content, published posts | read | read | read | write | write |
| Own profile | – | read / update (not role) | read | read | write |
| Customers, orders, order items, studio designs, social posts | – | – | read | write | write |
| Discounts | – | – | read | write | write |
| Audit log | – | – | – | read | read |
| Roles (`profiles.role`) | – | – | – | – | change others |

- Every staff permission requires a two-factor (`aal2`) session. Staff enroll
  TOTP at `/admin/mfa` on first sign-in. Make sure **Auth → Multi-factor → TOTP** is
  enabled in Supabase.
- Orders are written only by `create_order()`, which runs in one transaction and
  can only be called with the service-role key (the `/api/orders` route).
- The audit log is append-only.

## Bootstrapping the first owner

Run once in the SQL editor (no user JWT there, so the role guard allows it):

```sql
update public.profiles set role = 'owner' where email = 'you@example.com';
```

## Checking the live policies

```sql
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by 1, 4;
```
