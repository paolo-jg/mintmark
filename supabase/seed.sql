-- ─── MOCK DATA SEED ─────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor to populate demo listings.
-- Creates 2 sellers + 8 listings (5 fixed price, 3 auctions) with real coin data.

-- 1. Create auth users (bypasses email confirmation)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
) values
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'gary@mintmark.test',
    crypt('MockPassword1!', gen_salt('bf')),
    now(), now(), now(),
    '{"username":"greysheet_gary"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'diana@mintmark.test',
    crypt('MockPassword1!', gen_salt('bf')),
    now(), now(), now(),
    '{"username":"diana_numismatics"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb
  )
on conflict (id) do nothing;

-- 2. Profiles (trigger may already handle this, but insert explicitly to be safe)
insert into profiles (id, email, username, role, dealer_verified, bio) values
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'gary@mintmark.test',
    'greysheet_gary',
    'dealer',
    true,
    'Been collecting since 1987. Specializing in Morgan and Peace dollars, early US type coins. All coins guaranteed authentic.'
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'diana@mintmark.test',
    'diana_numismatics',
    'seller',
    false,
    'Collector turned seller. Mostly modern US commemoratives and proof sets.'
  )
on conflict (id) do update set
  username = excluded.username,
  role = excluded.role,
  dealer_verified = excluded.dealer_verified,
  bio = excluded.bio;

-- 3. Fixed-price listings
insert into listings (
  id, seller_id, title, description, price, listing_type, status,
  grading_service, cert_number, grade, verification_status, cac_designation,
  coin_name, year, mint_mark, denomination, population_at_grade, population_above,
  images
) values
  (
    '00000001-0000-0000-0000-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1881-S Morgan Dollar MS-65',
    'Stunning original luster with vibrant cartwheel effect. Well-struck with full cheek definition on Liberty. A gorgeous example of this popular date.',
    42500, 'fixed', 'active',
    'PCGS', '41056447', 'MS65', 'verified', true,
    'Morgan Dollar', 1881, 'S', '$1', 1819, 646,
    ARRAY['https://images.pcgs.com/CoinFacts/07968017_46625_Obv.jpg', 'https://images.pcgs.com/CoinFacts/07968017_46625_Rev.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1916-D Mercury Dime VF-20',
    'Key date Mercury dime in honest circulated condition. No problems, original surfaces. One of the most sought-after 20th century rarities.',
    285000, 'fixed', 'active',
    'PCGS', '38291004', 'VF20', 'verified', false,
    'Mercury Dime', 1916, 'D', '10C', 384, 892,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/1916-D_Mercury_dime_obverse.jpg/220px-1916-D_Mercury_dime_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000003',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '2021-W American Silver Eagle MS-70 First Day of Issue',
    'Perfect grade example from the first day of issue. Snow white surfaces with mirror-like fields. Comes in original PCGS holder with First Day of Issue designation.',
    22500, 'fixed', 'active',
    'PCGS', '43872910', 'MS70', 'verified', false,
    'American Silver Eagle', 2021, 'W', '$1', 4821, 0,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/2021_Silver_Eagle_obverse.jpg/220px-2021_Silver_Eagle_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000004',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1909-S VDB Lincoln Cent VF-35',
    'Classic first-year key date. Sharp VF details with all major lines visible. No cleaning or environmental damage. A true collector piece.',
    189500, 'fixed', 'active',
    'NGC', '6289875', 'VF35', 'unverified', false,
    'Lincoln Cent', 1909, 'S', '1C', null, null,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/1909-S-VDB-Cent-Obv.jpg/220px-1909-S-VDB-Cent-Obv.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000005',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1893-S Morgan Dollar Fine-12',
    'The King of Morgan Dollars. Genuine example in Fine-12 with no problems. This coin is the holy grail for Morgan dollar collectors. Investment grade.',
    1350000, 'fixed', 'active',
    'PCGS', '29104857', 'F12', 'verified', false,
    'Morgan Dollar', 1893, 'S', '$1', 62, 183,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/US_One_Dollar_Obv.png/220px-US_One_Dollar_Obv.png']
  );

-- 4. Auction listings
insert into listings (
  id, seller_id, title, description, price, listing_type, status,
  grading_service, cert_number, grade, verification_status, cac_designation,
  coin_name, year, mint_mark, denomination, population_at_grade, population_above,
  images
) values
  (
    '00000001-0000-0000-0000-000000000006',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1804 Silver Dollar Class I PR-62',
    'One of only 8 known Class I specimens. A true numismatic treasure and one of the most famous coins in American history. This example comes from a prominent private collection.',
    75000000, 'auction', 'active',
    'PCGS', '11000010', 'PR62', 'verified', false,
    'Bust Dollar', 1804, null, '$1', 1, 7,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/1804_dollar_obv.jpg/220px-1804_dollar_obv.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000007',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1955 Doubled Die Lincoln Cent MS-64 RD',
    'Dramatic doubling visible to the naked eye on date and lettering. Lustrous red surfaces. A spectacular example of this iconic error coin.',
    285000, 'auction', 'active',
    'NGC', '5884700', 'MS64RD', 'unverified', false,
    'Lincoln Cent', 1955, null, '1C', 241, 89,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/1955_doubled_die_cent.jpg/220px-1955_doubled_die_cent.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000008',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1932-D Washington Quarter MS-64',
    'First year of the Washington quarter series and the key date. Exceptional luster with minimal marks for the grade. Original skin.',
    94500, 'auction', 'active',
    'PCGS', '39201847', 'MS64', 'verified', true,
    'Washington Quarter', 1932, 'D', '25C', 88, 34,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/US_25_Cents_Obv.png/220px-US_25_Cents_Obv.png']
  );

-- 4b. More fixed-price listings (variety of series)
insert into listings (
  id, seller_id, title, description, price, listing_type, status,
  grading_service, cert_number, grade, verification_status, cac_designation,
  coin_name, year, mint_mark, denomination, population_at_grade, population_above,
  images
) values
  (
    '00000001-0000-0000-0000-000000000009',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1922 Peace Dollar MS-65',
    'Common date in an uncommon grade. Satiny white luster with full strike. A beautiful type coin that displays well.',
    32500, 'fixed', 'active',
    'PCGS', '82741092', 'MS65', 'verified', false,
    'Peace Dollar', 1922, null, '$1', 4821, 312,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Peace_dollar_obverse.jpg/250px-Peace_dollar_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000010',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1921 Peace Dollar MS-63',
    'First year of issue for the Peace Dollar series. High relief design unique to 1921. Well struck with original luster.',
    185000, 'fixed', 'active',
    'PCGS', '39102847', 'MS63', 'verified', false,
    'Peace Dollar', 1921, null, '$1', 892, 234,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Peace_dollar_obverse.jpg/250px-Peace_dollar_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000011',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1938-D Buffalo Nickel MS-66',
    'Final year of the Buffalo Nickel series. Exceptional strike with full horn and eye. Blazing original luster.',
    89500, 'fixed', 'active',
    'NGC', '4821039', 'MS66', 'verified', true,
    'Buffalo Nickel', 1938, 'D', '5C', 428, 97,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Buffalo_nickel_obverse_7.jpg/200px-Buffalo_nickel_obverse_7.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000012',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1916 Walking Liberty Half Dollar MS-64',
    'First year of issue for one of the most beautiful designs in American coinage. Well struck with original luster. Scarce this nice.',
    485000, 'fixed', 'active',
    'PCGS', '29018472', 'MS64', 'verified', false,
    'Walking Liberty Half Dollar', 1916, null, '50C', 124, 38,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Walking_liberty_half_dollar_obverse.jpg/220px-Walking_liberty_half_dollar_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000013',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1907 Saint-Gaudens Double Eagle MS-63',
    'First year of this iconic design considered by many the most beautiful US coin ever struck. Original luster with warm honey-gold surfaces.',
    375000, 'fixed', 'active',
    'PCGS', '38201948', 'MS63', 'verified', false,
    'Saint-Gaudens Double Eagle', 1907, null, '$20', 2841, 1204,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/1907_Saint_Gaudens_Double_Eagle_Ultra_High_Relief.jpg/220px-1907_Saint_Gaudens_Double_Eagle_Ultra_High_Relief.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000014',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1877 Indian Head Cent PR-65 RB',
    'Key date in proof only format. Stunning red-brown proof surfaces with full cameo effect. The rarest business strike date offered as a proof.',
    285000, 'fixed', 'active',
    'NGC', '5021847', 'PR65RB', 'verified', false,
    'Indian Head Cent', 1877, null, '1C', 82, 44,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Indian_Head_cent_obverse.jpg/220px-Indian_Head_cent_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000015',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1856 Flying Eagle Cent AU-55',
    'Pattern coin struck in limited quantities. Original surfaces with significant remaining luster. A key piece of American numismatic history.',
    425000, 'fixed', 'active',
    'PCGS', '11029384', 'AU55', 'verified', false,
    'Flying Eagle Cent', 1856, null, '1C', 219, 312,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Flying_eagle_cent_obverse.jpg/220px-Flying_eagle_cent_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000016',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1901-S Barber Quarter VF-30',
    'The key date of the Barber Quarter series. Only 72,664 minted. Sharp VF details with all major design elements clear. No problems.',
    895000, 'fixed', 'active',
    'PCGS', '29103847', 'VF30', 'verified', false,
    'Barber Quarter', 1901, 'S', '25C', 47, 89,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Barber_quarter_obverse.png/220px-Barber_quarter_obverse.png']
  ),
  (
    '00000001-0000-0000-0000-000000000017',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '2009-W American Gold Eagle MS-70',
    'Perfect grade ultra-high relief tribute to the famous 1907 Saint-Gaudens design. First strike designation. Flawless surfaces.',
    350000, 'fixed', 'active',
    'PCGS', '43921084', 'MS70', 'verified', false,
    'American Gold Eagle', 2009, 'W', '$20', 3241, 0,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/2009_Ultra_High_Relief_Double_Eagle_obverse.jpg/220px-2009_Ultra_High_Relief_Double_Eagle_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000018',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1950-D Jefferson Nickel MS-67 FS',
    'The famous key date Jefferson Nickel. Full Steps designation with six full steps on Monticello. Blazing original luster. Exceptional.',
    125000, 'fixed', 'active',
    'NGC', '6021948', 'MS67FS', 'verified', true,
    'Jefferson Nickel', 1950, 'D', '5C', 34, 8,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Jefferson_nickel_obverse_2004.jpg/220px-Jefferson_nickel_obverse_2004.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000019',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1916 Standing Liberty Quarter MS-64',
    'Extremely rare first-year type with exposed breast. Well struck for the type. Original luster with light golden toning. One of the true 20th century keys.',
    1250000, 'fixed', 'active',
    'PCGS', '29018473', 'MS64', 'verified', false,
    'Standing Liberty Quarter', 1916, null, '25C', 28, 14,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Standing_Liberty_Quarter_Type_1_Obverse.jpg/220px-Standing_Liberty_Quarter_Type_1_Obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000020',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1881-S Morgan Dollar MS-66',
    'A step above our other 1881-S example. Exceptional strike with full details on hair and eagle feathers. Vibrant cartwheel luster.',
    185000, 'fixed', 'active',
    'NGC', '6102948', 'MS66', 'verified', true,
    'Morgan Dollar', 1881, 'S', '$1', 646, 89,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Morgan_dollar_obverse.jpg/220px-Morgan_dollar_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000021',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1796 Draped Bust Dime VF-20',
    'First year of the Draped Bust dime series. One of the earliest US dimes ever struck. Honest circulated surfaces with original grey patina.',
    485000, 'fixed', 'active',
    'PCGS', '10029384', 'VF20', 'verified', false,
    'Draped Bust Dime', 1796, null, '10C', 38, 62,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Draped_Bust_dime_obverse.jpg/220px-Draped_Bust_dime_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000022',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1885-CC Morgan Dollar MS-64',
    'Carson City key date. Low mintage of only 228,000. Well struck with original luster and light toning. The CC mint mark is bold and clear.',
    425000, 'fixed', 'active',
    'PCGS', '38201049', 'MS64', 'verified', true,
    'Morgan Dollar', 1885, 'CC', '$1', 312, 48,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Morgan_dollar_obverse.jpg/220px-Morgan_dollar_obverse.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000023',
    'a1b2c3d4-0002-0002-0002-000000000002',
    '1924 Saint-Gaudens Double Eagle MS-65',
    'Most common date in MS-65 but still a spectacular coin. Brilliant lustrous surfaces with sharp strike. A classic investment-grade gold type coin.',
    325000, 'fixed', 'active',
    'NGC', '5829104', 'MS65', 'verified', false,
    'Saint-Gaudens Double Eagle', 1924, null, '$20', 8421, 2341,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/1907_Saint_Gaudens_Double_Eagle_Ultra_High_Relief.jpg/220px-1907_Saint_Gaudens_Double_Eagle_Ultra_High_Relief.jpg']
  ),
  (
    '00000001-0000-0000-0000-000000000024',
    'a1b2c3d4-0001-0001-0001-000000000001',
    '1943 Lincoln Cent Steel MS-67',
    'Wartime steel cent in a superb gem grade. Brilliant surfaces with full mint luster. One of the finest known examples of this wartime issue.',
    28500, 'fixed', 'active',
    'PCGS', '41029384', 'MS67', 'verified', false,
    'Lincoln Cent', 1943, null, '1C', 284, 42,
    ARRAY['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lincoln_cent_wheat_reverse.jpg/220px-Lincoln_cent_wheat_reverse.jpg']
  );

-- 5. Auctions for the auction listings
insert into auctions (
  id, listing_id, start_price, current_bid, reserve_price,
  start_time, end_time, bid_count, high_bidder_id
) values
  (
    '00000002-0000-0000-0000-000000000001',
    '00000001-0000-0000-0000-000000000006',
    50000000, 63500000, 70000000,
    now() - interval '2 days',
    now() + interval '1 day 4 hours 22 minutes',
    7, null
  ),
  (
    '00000002-0000-0000-0000-000000000002',
    '00000001-0000-0000-0000-000000000007',
    150000, 224000, null,
    now() - interval '1 day',
    now() + interval '3 hours 18 minutes',
    5, null
  ),
  (
    '00000002-0000-0000-0000-000000000003',
    '00000001-0000-0000-0000-000000000008',
    65000, 65000, 85000,
    now() - interval '4 hours',
    now() + interval '2 days 11 hours',
    0, null
  );
