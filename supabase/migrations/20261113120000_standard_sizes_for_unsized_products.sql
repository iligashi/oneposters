-- Give every product that has no sizes the standard size range, so it can be ordered.
--
-- Checkout prices each item from public.product_sizes. Products created before the
-- admin's sizes editor had no rows there, so their orders were rejected with
-- '"<title>" is not available in the selected size or frame'.
--
-- Products that already have at least one size are left untouched. Safe to run more
-- than once. Prices match STANDARD_SIZES in app/admin/sections/products.tsx.

begin;

insert into public.product_sizes (product_id, label, width_cm, height_cm, price_cents)
select p.id, s.label, s.width_cm, s.height_cm, s.price_cents
from public.products p
cross join (values
  ('A4',     21.0, 29.7, 3200),
  ('A3',     29.7, 42.0, 4000),
  ('30×40',  30.0, 40.0, 4600),
  ('50×70',  50.0, 70.0, 5400),
  ('70×100', 70.0, 100.0, 6200)
) as s(label, width_cm, height_cm, price_cents)
where not exists (select 1 from public.product_sizes ps where ps.product_id = p.id);

commit;
