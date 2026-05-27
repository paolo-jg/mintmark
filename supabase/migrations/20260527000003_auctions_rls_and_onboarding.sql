-- Auctions table: SELECT policy (anyone can view auction details for active listings)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'auctions' AND policyname = 'anyone can view auctions'
  ) THEN
    CREATE POLICY "anyone can view auctions"
      ON auctions FOR SELECT
      USING (true);
  END IF;
END $$;

-- Auctions table: UPDATE policy (only the listing seller or team member can update)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'auctions' AND policyname = 'sellers can update auctions'
  ) THEN
    CREATE POLICY "sellers can update auctions"
      ON auctions FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM listings
          WHERE listings.id = auctions.listing_id
            AND (
              listings.seller_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM team_members
                WHERE team_members.dealer_id = listings.seller_id
                  AND team_members.user_id = auth.uid()
              )
            )
        )
      );
  END IF;
END $$;

-- Profile: add onboarding_completed column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- GRANT SELECT on auctions to authenticated and anon (needed for nested Supabase queries)
GRANT SELECT ON auctions TO authenticated;
GRANT SELECT ON auctions TO anon;
