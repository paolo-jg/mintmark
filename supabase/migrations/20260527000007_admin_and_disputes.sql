-- Admin flag and suspension fields on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- Platform-wide settings (key/value store)
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO platform_settings (key, value) VALUES
  ('platform_paused', 'false'),
  ('maintenance_message', '"The platform is temporarily unavailable. Please check back soon."'),
  ('new_registrations_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings_public_read" ON platform_settings FOR SELECT USING (true);

-- In-app disputes filed by buyers
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  filed_by uuid REFERENCES profiles(id) NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'item_not_received',
    'item_not_as_described',
    'counterfeit',
    'unauthorized_purchase',
    'other'
  )),
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status text DEFAULT 'open' CHECK (status IN (
    'open',
    'under_review',
    'resolved_buyer',
    'resolved_seller',
    'closed'
  )),
  admin_notes text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_filed_by ON disputes(filed_by);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_participants_read" ON disputes
  FOR SELECT USING (
    filed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = disputes.order_id
        AND orders.seller_id = auth.uid()
    )
  );

CREATE POLICY "buyers_can_file_disputes" ON disputes
  FOR INSERT WITH CHECK (filed_by = auth.uid());

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) NOT NULL,
  action text NOT NULL,
  target_type text CHECK (target_type IN ('user', 'listing', 'order', 'dispute', 'platform')),
  target_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
-- admin_actions is service-role only; no user policies needed
