-- Returns / refund requests system
CREATE TABLE IF NOT EXISTS returns (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  filed_by       uuid        NOT NULL REFERENCES profiles(id),
  reason         text        NOT NULL CHECK (reason IN (
    'not_as_described', 'changed_mind', 'damaged', 'wrong_item', 'other'
  )),
  description    text        NOT NULL,
  status         text        NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'approved', 'label_sent', 'received', 'refunded', 'rejected', 'closed'
  )),
  refund_amount_cents  integer,
  admin_notes    text,
  resolved_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_order_id  ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status     ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_filed_by   ON returns(filed_by);

ALTER TABLE admin_actions
  DROP CONSTRAINT IF EXISTS admin_actions_target_type_check;

ALTER TABLE admin_actions
  ADD CONSTRAINT admin_actions_target_type_check
  CHECK (target_type IN ('user', 'listing', 'order', 'dispute', 'return', 'platform'));

-- RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Buyer and seller on the order can view their return
CREATE POLICY returns_participants_read ON returns
  FOR SELECT USING (
    filed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = returns.order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- Only the buyer on the order can file a return
CREATE POLICY buyers_can_file_returns ON returns
  FOR INSERT WITH CHECK (
    filed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = returns.order_id AND o.buyer_id = auth.uid()
    )
  );
