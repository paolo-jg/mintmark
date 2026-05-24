-- Add coin profile / metadata columns to collection_items
-- Run this in the Supabase SQL editor (or via supabase db push).

alter table collection_items
  add column if not exists series_slug      text,
  add column if not exists price_row_label  text,
  add column if not exists coin_profile     jsonb,
  add column if not exists user_images      text[];

-- Index series_slug for future filtering by series
create index if not exists collection_items_series_slug_idx
  on collection_items(series_slug);

comment on column collection_items.series_slug is
  'Slug of the coin series from the catalog (e.g. "morgan-dollar")';

comment on column collection_items.price_row_label is
  'The specific row label from the pricing table (e.g. "1893-S"). Identifies the exact coin date/mint.';

comment on column collection_items.coin_profile is
  'Snapshot of the coin''s educational profile at time of save: description, specs, key_dates, price_headers, price_row.';

comment on column collection_items.user_images is
  'Base64-encoded data URLs of user-uploaded coin photos (max 4). To be replaced with storage URLs in production.';
