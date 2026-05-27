ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS shipping_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS shipping_price_cents integer;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_price_cents integer NOT NULL DEFAULT 0;
