-- Performance indexes for the most-filtered and most-sorted columns.
-- All use IF NOT EXISTS so this is safe to run multiple times.

-- listings: filtered by status on every browse query; by seller_id on sell dashboard
CREATE INDEX IF NOT EXISTS idx_listings_status        ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_seller_status ON listings (seller_id, status);

-- orders: filtered by buyer_id, seller_id, status across many routes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id        ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id       ON orders (seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status   ON orders (seller_id, status);

-- collection_items: always filtered by user_id + type (owned vs wishlist)
CREATE INDEX IF NOT EXISTS idx_collection_items_user_type ON collection_items (user_id, type);
