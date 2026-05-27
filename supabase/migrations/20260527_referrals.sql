-- Referral code on every profile (short, URL-safe, unique)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_free_until timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_credit_months integer NOT NULL DEFAULT 0;

-- Backfill existing users: first 8 chars of their UUID, uppercase
UPDATE profiles
  SET referral_code = upper(substring(replace(id::text, '-', ''), 1, 8))
  WHERE referral_code IS NULL;

-- Trigger: auto-assign referral_code on new profile insert
CREATE OR REPLACE FUNCTION assign_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(replace(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_referral_code ON profiles;
CREATE TRIGGER trg_assign_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_referral_code();

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id),
  referred_id uuid NOT NULL REFERENCES profiles(id),
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_id_unique ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

GRANT SELECT ON public.referrals TO service_role;
GRANT INSERT, UPDATE ON public.referrals TO service_role;
GRANT SELECT ON public.profiles TO service_role;
GRANT UPDATE ON public.profiles TO service_role;
