-- Cost basis tracking for dealers
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS cost_basis_cents INTEGER;

-- Add concierge shipping type support (shipping_type is text, no constraint change needed)
-- Mark listings >= $500k as requiring concierge shipping
ALTER TABLE listings ADD COLUMN IF NOT EXISTS requires_concierge BOOLEAN NOT NULL DEFAULT FALSE;
