-- Private profile data — only the owning user can read or update.
-- first_name / last_name are stored here instead of profiles so they
-- are never exposed via the public SELECT policy on profiles.
CREATE TABLE IF NOT EXISTS profiles_private (
  id         uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name text,
  last_name  text
);

ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner can view own private profile"
  ON profiles_private FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "owner can update own private profile"
  ON profiles_private FOR UPDATE
  USING (auth.uid() = id);

-- INSERT is done server-side (trigger / onboarding API) — allow it from any role
CREATE POLICY "service can insert private profile"
  ON profiles_private FOR INSERT
  WITH CHECK (true);
