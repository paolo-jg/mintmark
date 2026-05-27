-- ── Team invites ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token       text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_invites_dealer_id_idx ON team_invites (dealer_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx     ON team_invites (token);

-- ── Team members ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dealer_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_dealer_id_idx ON team_members (dealer_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx   ON team_members (user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Dealer can read their own invites
CREATE POLICY "team_invites_dealer_read"
  ON team_invites FOR SELECT
  USING (dealer_id = auth.uid());

-- Dealer can insert invites (only dealer-tier accounts enforced at API level)
CREATE POLICY "team_invites_dealer_insert"
  ON team_invites FOR INSERT
  WITH CHECK (dealer_id = auth.uid());

-- Dealer can revoke invites
CREATE POLICY "team_invites_dealer_update"
  ON team_invites FOR UPDATE
  USING (dealer_id = auth.uid());

-- Anyone can read an invite by token (needed for the accept page)
CREATE POLICY "team_invites_read_by_token"
  ON team_invites FOR SELECT
  USING (true);  -- API enforces token lookup; status/expiry validated server-side

-- Dealer can read their team
CREATE POLICY "team_members_dealer_read"
  ON team_members FOR SELECT
  USING (dealer_id = auth.uid());

-- Members can read their own membership
CREATE POLICY "team_members_self_read"
  ON team_members FOR SELECT
  USING (user_id = auth.uid());

-- Insert handled via service role in accept API
-- Delete: dealer or the member themselves
CREATE POLICY "team_members_dealer_delete"
  ON team_members FOR DELETE
  USING (dealer_id = auth.uid() OR user_id = auth.uid());

-- ── Helper: is current user a team member of a given dealer ───────────────────

CREATE OR REPLACE FUNCTION is_team_member_of(p_dealer_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE dealer_id = p_dealer_id
      AND user_id   = auth.uid()
  )
$$;

-- ── Listings: allow team members to manage dealer's listings ──────────────────

-- Read
CREATE POLICY "team_members_read_dealer_listings"
  ON listings FOR SELECT
  USING (is_team_member_of(seller_id));

-- Create listings on behalf of dealer
CREATE POLICY "team_members_create_dealer_listings"
  ON listings FOR INSERT
  WITH CHECK (is_team_member_of(seller_id));

-- Update dealer listings
CREATE POLICY "team_members_update_dealer_listings"
  ON listings FOR UPDATE
  USING (is_team_member_of(seller_id));

-- ── Orders: allow team members to read dealer's orders ────────────────────────

CREATE POLICY "team_members_read_dealer_orders"
  ON orders FOR SELECT
  USING (is_team_member_of(seller_id));
