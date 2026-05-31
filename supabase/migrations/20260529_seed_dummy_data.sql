-- Dummy data for leaderboard and dealers page UI preview.
-- All users have emails ending in @pedigreecoins-demo.test for easy identification and cleanup.
-- Fixed UUIDs + ON CONFLICT DO NOTHING makes this idempotent.

DO $$
DECLARE
  u1  constant uuid := 'aa100001-0000-0000-0000-000000000001';
  u2  constant uuid := 'bb200002-0000-0000-0000-000000000002';
  u3  constant uuid := 'cc300003-0000-0000-0000-000000000003';
  u4  constant uuid := 'dd400004-0000-0000-0000-000000000004';
  u5  constant uuid := 'ee500005-0000-0000-0000-000000000005';
  u6  constant uuid := 'ff600006-0000-0000-0000-000000000006';
  u7  constant uuid := 'ab700007-0000-0000-0000-000000000007';
  u8  constant uuid := 'bc800008-0000-0000-0000-000000000008';
  u9  constant uuid := 'cd900009-0000-0000-0000-000000000009';
  u10 constant uuid := 'de100010-0000-0000-0000-000000000010';
  dlisting constant uuid := 'bd000000-0000-0000-0000-000000000000';
BEGIN

  -- Auth users
  INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    (u1,  'james.whitmore@pedigreecoins-demo.test',  now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u2,  'eleanor.voss@pedigreecoins-demo.test',    now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u3,  'marcus.reid@pedigreecoins-demo.test',     now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u4,  'caroline.hayes@pedigreecoins-demo.test',  now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u5,  'thomas.decker@pedigreecoins-demo.test',   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u6,  'olivia.strand@pedigreecoins-demo.test',   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u7,  'richard.ashby@pedigreecoins-demo.test',   now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u8,  'diana.park@pedigreecoins-demo.test',      now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u9,  'henry.colton@pedigreecoins-demo.test',    now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    (u10, 'sophia.blake@pedigreecoins-demo.test',    now(), now(), now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Dealer profiles
  INSERT INTO profiles (id, email, username, display_name, subscription_tier, dealer_verified, dealer_description, average_rating, rating_count, completed_orders_count)
  VALUES
    (u1, 'james.whitmore@pedigreecoins-demo.test',  'jwhitmore',    'James Whitmore Numismatics', 'dealer', true, 'Specializing in early American coinage and Morgan dollars. 20+ years in the hobby.',  4.9, 142, 318),
    (u2, 'eleanor.voss@pedigreecoins-demo.test',    'eleanor_voss', 'Eleanor Voss Rare Coins',    'dealer', true, 'PCGS authorized dealer. Focus on gold type coins and key-date half dollars.',         4.8,  89, 210),
    (u3, 'marcus.reid@pedigreecoins-demo.test',     'mreid_coins',  'Marcus Reid and Associates', 'dealer', true, 'Dealer in certified U.S. currency and classic commemoratives.',                        4.7,  54, 175),
    (u4, 'caroline.hayes@pedigreecoins-demo.test',  'chayescoins',  'Hayes Coin Gallery',         'dealer', true, 'Specializing in Morgan and Peace silver dollars. All coins PCGS or NGC certified.',   4.6,  38, 130),
    (u5, 'thomas.decker@pedigreecoins-demo.test',   'tdecker',      'Decker Numismatic Group',    'dealer', true, 'Comprehensive inventory of 20th-century type coins. Ships same day.',                 4.5,  21,  88)
  ON CONFLICT (id) DO NOTHING;

  -- Collector profiles
  INSERT INTO profiles (id, email, username, display_name, subscription_tier, dealer_verified)
  VALUES
    (u6,  'olivia.strand@pedigreecoins-demo.test',  'olivia_s',  'Olivia S.',  'collector_premium', false),
    (u7,  'richard.ashby@pedigreecoins-demo.test',  'rashby',    'Richard A.', 'collector_premium', false),
    (u8,  'diana.park@pedigreecoins-demo.test',     'dianapark', 'Diana P.',   'collector_basic',   false),
    (u9,  'henry.colton@pedigreecoins-demo.test',   'hcolton',   'Henry C.',   'collector_premium', false),
    (u10, 'sophia.blake@pedigreecoins-demo.test',   'sblake',    'Sophia B.',  'collector_basic',   false)
  ON CONFLICT (id) DO NOTHING;

  -- Shared dummy listing (FK target for demo orders)
  INSERT INTO listings (id, seller_id, title, coin_name, price, status, listing_type, grading_service)
  VALUES (dlisting, u1, 'Demo Listing', 'Demo Coin', 100000, 'sold', 'fixed', 'PCGS')
  ON CONFLICT (id) DO NOTHING;

  -- Orders for leaderboard
  INSERT INTO orders (id, listing_id, buyer_id, seller_id, amount, ship_to_name, ship_to_street1, ship_to_city, ship_to_state, ship_to_zip, ship_to_country, status, created_at, updated_at)
  VALUES
    ('bd000001-0000-0000-0000-000000000001', dlisting, u6,  u1, 498500, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '5 days',  now()),
    ('bd000002-0000-0000-0000-000000000002', dlisting, u7,  u1, 387000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '8 days',  now()),
    ('bd000003-0000-0000-0000-000000000003', dlisting, u8,  u2, 725000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '12 days', now()),
    ('bd000004-0000-0000-0000-000000000004', dlisting, u6,  u2, 512000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '15 days', now()),
    ('bd000005-0000-0000-0000-000000000005', dlisting, u9,  u3, 298000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '18 days', now()),
    ('bd000006-0000-0000-0000-000000000006', dlisting, u10, u3, 419000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '20 days', now()),
    ('bd000007-0000-0000-0000-000000000007', dlisting, u7,  u4, 610000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '22 days', now()),
    ('bd000008-0000-0000-0000-000000000008', dlisting, u8,  u4, 333000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '25 days', now()),
    ('bd000009-0000-0000-0000-000000000009', dlisting, u9,  u5, 227000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '28 days', now()),
    ('bd000010-0000-0000-0000-000000000010', dlisting, u10, u5, 185000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '30 days', now()),
    ('bd000011-0000-0000-0000-000000000011', dlisting, u6,  u3, 540000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '33 days', now()),
    ('bd000012-0000-0000-0000-000000000012', dlisting, u7,  u2, 460000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '35 days', now()),
    ('bd000013-0000-0000-0000-000000000013', dlisting, u8,  u1, 820000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '38 days', now()),
    ('bd000014-0000-0000-0000-000000000014', dlisting, u9,  u4, 315000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '40 days', now()),
    ('bd000015-0000-0000-0000-000000000015', dlisting, u10, u1, 265000, 'Demo', '1 Main St', 'New York', 'NY', '10001', 'US', 'complete', now() - interval '42 days', now())
  ON CONFLICT (id) DO NOTHING;

END $$;
