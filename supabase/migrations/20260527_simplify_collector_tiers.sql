-- Downgrade any collector_standard users to collector_basic
UPDATE profiles SET subscription_tier = 'collector_basic' WHERE subscription_tier = 'collector_standard';

-- Drop old check constraint and add new one without collector_standard
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN (
    'collector_basic', 'collector_premium',
    'dealer_basic', 'dealer_standard', 'dealer_premium'
  ));
