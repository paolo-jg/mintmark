-- Migrate all dealer variants to single dealer tier
UPDATE profiles SET subscription_tier = 'dealer'
  WHERE subscription_tier IN ('dealer_basic', 'dealer_standard', 'dealer_premium');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('collector_basic', 'collector_premium', 'dealer'));
