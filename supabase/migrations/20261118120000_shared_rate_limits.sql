-- Shared rate limiting
--
-- Apply BEFORE deploying the matching application code:
--   supabase db push            (Supabase CLI, linked project)
--   or paste into Supabase Dashboard -> SQL editor and run.
--
-- The previous limiter kept counters in memory, so every serverless instance
-- (and every cold start) had its own budget. This stores fixed-window counters
-- in Postgres so /api/orders, /api/promo and /api/studio/upload are limited
-- across all instances. Only the service role (route handlers) can call it.

begin;

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- No policies: the table is unreachable through the anon/authenticated roles
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- Atomically count one hit for p_key in a fixed window of p_window_seconds.
-- Returns whether the hit is allowed, the remaining budget and, when blocked,
-- how many seconds until the window resets.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_reset timestamptz;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when r.reset_at <= now() then 1 else r.count + 1 end,
        reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning r.count, r.reset_at into v_count, v_reset;

  -- Opportunistic cleanup of long-expired windows (cheap, bounded)
  if random() < 0.01 then
    delete from public.rate_limits
    where key in (select key from public.rate_limits where reset_at < now() - interval '1 day' limit 500);
  end if;

  allowed := v_count <= p_limit;
  remaining := greatest(0, p_limit - v_count);
  retry_after_seconds := case when allowed then 0 else greatest(1, ceil(extract(epoch from (v_reset - now())))::integer) end;
  return next;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

commit;
