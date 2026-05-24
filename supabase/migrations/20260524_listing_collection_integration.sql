-- Make transaction_id nullable (no Stripe yet)
alter table orders alter column transaction_id drop not null;

-- Add listing columns for collection integration
alter table listings add column if not exists series_slug text;
alter table listings add column if not exists price_row_label text;
alter table listings add column if not exists collection_item_id uuid references collection_items(id) on delete set null;

-- Allow ungraded coins
alter table listings alter column cert_number drop not null;
alter table listings alter column grade drop not null;
alter table listings drop constraint if exists listings_grading_service_check;
alter table listings add constraint listings_grading_service_check
  check (grading_service in ('PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS') or grading_service is null);
alter table listings alter column grading_service drop not null;

-- Grant service role access
grant all on public.orders to service_role;
grant all on public.listings to service_role;
