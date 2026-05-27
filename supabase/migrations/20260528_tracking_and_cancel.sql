-- EasyPost tracker ID on shipments
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS easypost_tracker_id text;

-- cancelled status support on orders (add to any existing check constraint)
-- No explicit enum to alter — status is text with app-level validation

-- Index for auto-cancel cron: find old awaiting_shipment orders fast
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at)
  WHERE status = 'awaiting_shipment';
