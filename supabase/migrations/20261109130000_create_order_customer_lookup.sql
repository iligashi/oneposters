-- Fix create_order(): customers.email has no unique constraint in this database,
-- so "insert ... on conflict (email)" failed with 42P10 and every checkout errored.
--
-- The customer is now found by email (case-insensitive) and created only when
-- missing. A transaction-scoped advisory lock on the email stops two simultaneous
-- checkouts from creating duplicate customers. Safe to run more than once.

begin;

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
  v_email text := lower(trim(p_customer ->> 'email'));
  v_name text := nullif(trim(p_customer ->> 'name'), '');
  v_customer_id public.customers.id%type;
  v_order_id public.orders.id%type;
  v_order_number public.orders.order_number%type;
  v_discount public.discounts%rowtype;
begin
  if v_email is null or v_email = '' then
    raise exception 'customer_email_required';
  end if;
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

  -- One customer per email. An existing customer's name is never overwritten by a
  -- guest checkout; it is only filled in when it was empty.
  perform pg_advisory_xact_lock(hashtext('oneposters.customer:' || v_email));

  select c.id into v_customer_id
  from public.customers c
  where lower(c.email) = v_email
  limit 1;

  if v_customer_id is null then
    insert into public.customers (email, name)
    values (v_email, v_name)
    returning id into v_customer_id;
  elsif v_name is not null then
    update public.customers set name = v_name
    where id = v_customer_id and (name is null or trim(name) = '');
  end if;

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
