-- Add subscription_tier to profiles
-- Run in Supabase SQL editor or via supabase db push

alter table profiles
  add column if not exists subscription_tier text
    not null default 'collector_basic'
    check (subscription_tier in (
      'collector_basic',
      'collector_standard',
      'collector_premium',
      'dealer_basic',
      'dealer_standard',
      'dealer_premium'
    ));

comment on column profiles.subscription_tier is
  'The user''s active subscription tier. Determines monthly listing limits and fee rates.';
