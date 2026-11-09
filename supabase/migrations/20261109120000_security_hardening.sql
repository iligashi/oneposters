-- oneposters security hardening
--
-- Apply BEFORE deploying the matching application code:
--   supabase db push            (Supabase CLI, linked project)
--   or paste into Supabase Dashboard -> SQL editor and run.
--
-- What it does
--   1. Staff helpers that require a staff role AND a two-factor (aal2) session.
--   2. Stops anyone except an owner from changing profiles.role (no self-promotion).
--   3. Replaces every row-level-security policy on the shop tables with a known,
--      least-privilege set: the public can only read published catalog data;
--      customers, orders, order items, designs, discounts and the audit log are
--      staff-only; support is read-only; the audit log is append-only.
--   4. Adds orders.discount_code, discounts.used_count and studio_designs.order_id.
--   5. Adds create_order(), a transactional order writer callable only by the
--      service role (the /api/orders route), so anonymous visitors no longer need
--      any write access to customers, orders or order_items.
--
-- Review the "policies" section against any custom policies you rely on: this
-- migration drops ALL existing policies on the listed tables before recreating them.

begin;

-- Clean up helpers from an earlier attempt of this migration. An existing
-- zero-argument public.is_staff() (if any) is left untouched.
drop function if exists public.is_staff(text[]);

-- 1. Staff helpers --------------------------------------------------------------

create or replace function public.oneposters_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text
  from public.profiles p
  where p.id = auth.uid()
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and p.role::text in ('owner', 'manager', 'support')
$$;

create or replace function public.has_staff_role(allowed text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.oneposters_staff_role() = any(allowed), false)
$$;

revoke all on function public.oneposters_staff_role() from public;
revoke all on function public.has_staff_role(text[]) from public;
grant execute on function public.oneposters_staff_role() to anon, authenticated, service_role;
grant execute on function public.has_staff_role(text[]) to anon, authenticated, service_role;

-- 2. Role changes are owner-only ---------------------------------------------------

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No end-user JWT: service role, SQL editor or the auth signup trigger.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role is distinct from 'customer' and not public.has_staff_role(array['owner']) then
      new.role := 'customer';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    if not public.has_staff_role(array['owner']) then
      raise exception 'Only an owner can change roles' using errcode = '42501';
    end if;
    if old.id = auth.uid() then
      raise exception 'Owners cannot change their own role' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- 3. Columns used by the application --------------------------------------------------

alter table public.orders add column if not exists discount_code text;
alter table public.discounts add column if not exists used_count integer not null default 0;

do $$
declare
  order_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into order_id_type
  from pg_attribute a
  where a.attrelid = 'public.orders'::regclass and a.attname = 'id';

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'studio_designs' and column_name = 'order_id'
  ) then
    execute format(
      'alter table public.studio_designs add column order_id %s references public.orders(id) on delete set null',
      order_id_type
    );
  end if;
end
$$;

-- 4. Policies ------------------------------------------------------------------------

do $$
declare
  t text;
  r record;
  managed text[] := array[
    'profiles', 'customers', 'orders', 'order_items', 'studio_designs', 'audit_log',
    'discounts', 'products', 'product_images', 'product_sizes', 'categories',
    'frame_options', 'paper_options', 'posts', 'social_posts', 'site_content'
  ];
begin
  foreach t in array managed loop
    if to_regclass('public.' || t) is null then
      raise notice 'Skipping missing table public.%', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
  end loop;
end
$$;

-- profiles: users see and edit their own row (role changes blocked by the trigger);
-- staff can read all; owners can edit any.
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.has_staff_role(array['owner', 'manager', 'support']));
create policy profiles_insert_self on public.profiles for insert
  with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.has_staff_role(array['owner']))
  with check (id = auth.uid() or public.has_staff_role(array['owner']));

-- Published catalog is public; everything is editable by owner/manager.
create policy products_read on public.products for select
  using (status::text = 'published' or public.has_staff_role(array['owner', 'manager', 'support']));
create policy products_write on public.products for all
  using (public.has_staff_role(array['owner', 'manager']))
  with check (public.has_staff_role(array['owner', 'manager']));

create policy product_images_read on public.product_images for select
  using (public.has_staff_role(array['owner', 'manager', 'support']) or exists (
    select 1 from public.products p where p.id = product_images.product_id and p.status::text = 'published'));
create policy product_images_write on public.product_images for all
  using (public.has_staff_role(array['owner', 'manager']))
  with check (public.has_staff_role(array['owner', 'manager']));

create policy product_sizes_read on public.product_sizes for select
  using (public.has_staff_role(array['owner', 'manager', 'support']) or exists (
    select 1 from public.products p where p.id = product_sizes.product_id and p.status::text = 'published'));
create policy product_sizes_write on public.product_sizes for all
  using (public.has_staff_role(array['owner', 'manager']))
  with check (public.has_staff_role(array['owner', 'manager']));

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'frame_options', 'paper_options', 'site_content'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('create policy %I on public.%I for select using (true)', t || '_read', t);
    execute format(
      'create policy %I on public.%I for all using (public.has_staff_role(array[''owner'', ''manager''])) with check (public.has_staff_role(array[''owner'', ''manager'']))',
      t || '_write', t);
  end loop;

  if to_regclass('public.posts') is not null then
    create policy posts_read on public.posts for select
      using (status::text = 'published' or public.has_staff_role(array['owner', 'manager', 'support']));
    create policy posts_write on public.posts for all
      using (public.has_staff_role(array['owner', 'manager']))
      with check (public.has_staff_role(array['owner', 'manager']));
  end if;

  -- Staff-only data: support may read, owner/manager may write.
  foreach t in array array['customers', 'orders', 'order_items', 'studio_designs', 'discounts', 'social_posts'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('create policy %I on public.%I for select using (public.has_staff_role(array[''owner'', ''manager'', ''support'']))', t || '_staff_read', t);
    execute format(
      'create policy %I on public.%I for all using (public.has_staff_role(array[''owner'', ''manager''])) with check (public.has_staff_role(array[''owner'', ''manager'']))',
      t || '_staff_write', t);
  end loop;
end
$$;

-- Audit log: append-only for staff, readable by owner/manager, never updated or deleted.
create policy audit_log_read on public.audit_log for select
  using (public.has_staff_role(array['owner', 'manager']));
create policy audit_log_append on public.audit_log for insert
  with check (public.has_staff_role(array['owner', 'manager', 'support']) and actor_id = auth.uid());
revoke update, delete, truncate on public.audit_log from anon, authenticated;

-- Keep the promo code that used to be hard-coded in the checkout.
insert into public.discounts (code, type, value, active)
select 'WELCOME10', 'percent', 10, true
where not exists (select 1 from public.discounts where upper(code) = 'WELCOME10');

-- 5. Transactional order creation (service role only) -----------------------------------

create or replace function public.create_order(
  p_customer jsonb,
  p_order jsonb,
  p_items jsonb,
  p_designs jsonb default '[]'::jsonb,
  p_discount_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id public.customers.id%type;
  v_order_id public.orders.id%type;
  v_order_number public.orders.order_number%type;
  v_discount public.discounts%rowtype;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'order_has_no_items';
  end if;

  if p_discount_id is not null then
    select * into v_discount from public.discounts where id::text = p_discount_id for update;
    if not found or not coalesce(v_discount.active, false) then
      raise exception 'discount_invalid';
    end if;
    if v_discount.usage_limit is not null and v_discount.used_count >= v_discount.usage_limit then
      raise exception 'discount_exhausted';
    end if;
    update public.discounts set used_count = used_count + 1 where id = v_discount.id;
  end if;

  -- An existing customer's name is never overwritten by a guest checkout.
  insert into public.customers (email, name)
  values (lower(p_customer ->> 'email'), p_customer ->> 'name')
  on conflict (email) do update set name = coalesce(public.customers.name, excluded.name)
  returning id into v_customer_id;

  insert into public.orders (
    order_number, customer_id, status, payment_status, subtotal_cents, shipping_cents,
    discount_cents, tax_cents, total_cents, currency, shipping_address, discount_code)
  select r.order_number, v_customer_id, r.status, r.payment_status, r.subtotal_cents, r.shipping_cents,
    r.discount_cents, r.tax_cents, r.total_cents, r.currency, r.shipping_address, r.discount_code
  from jsonb_populate_record(null::public.orders, p_order) r
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, product_id, title_snapshot, size_label, frame_name, paper_name, unit_price_cents, quantity)
  select v_order_id, r.product_id, r.title_snapshot, r.size_label, r.frame_name, r.paper_name,
    r.unit_price_cents, r.quantity
  from jsonb_populate_recordset(null::public.order_items, p_items) r;

  insert into public.studio_designs (
    customer_id, order_id, original_image_url, settings, size_label, frame, paper, status)
  select v_customer_id, v_order_id, r.original_image_url, r.settings, r.size_label, r.frame, r.paper,
    coalesce(r.status, 'received')
  from jsonb_populate_recordset(null::public.studio_designs, coalesce(p_designs, '[]'::jsonb)) r;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
end
$$;

revoke all on function public.create_order(jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb, jsonb, jsonb, text) to service_role;

commit;
