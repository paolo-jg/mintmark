-- Track exactly how much was deducted from the seller's payout for each label.
-- This is the source of truth for shipping P&L: deduction - rate_amount = platform margin.
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS label_deduction_cents integer;
