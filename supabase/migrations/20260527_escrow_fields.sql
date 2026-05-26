ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS seller_payout_cents integer,
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer,
  ADD COLUMN IF NOT EXISTS transfer_released boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_id text;
