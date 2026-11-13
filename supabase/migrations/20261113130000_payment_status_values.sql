-- Orders failed with 22P02 "invalid input value for enum payment_status: \"pending\"".
-- The live payment_status enum was created without the values the app uses
-- (app/api/orders/route.ts inserts 'pending'; the admin offers pending/paid/refunded/failed).
-- Add any that are missing. Safe to run more than once.
alter type public.payment_status add value if not exists 'pending';
alter type public.payment_status add value if not exists 'paid';
alter type public.payment_status add value if not exists 'refunded';
alter type public.payment_status add value if not exists 'failed';
