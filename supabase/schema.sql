-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  username text unique not null,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'dealer')),
  avatar_url text,
  bio text,
  dealer_verified boolean not null default false,
  stripe_account_id text, -- Stripe Connect account for sellers
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── LISTINGS ────────────────────────────────────────────────────────────────
create table listings (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price integer, -- in cents, null for auction-only
  images text[] not null default '{}',
  listing_type text not null check (listing_type in ('fixed', 'auction')),
  status text not null default 'draft' check (status in ('active', 'sold', 'expired', 'draft')),

  -- Grading
  grading_service text not null check (grading_service in ('PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS')),
  cert_number text not null,
  grade text not null,
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'unverified', 'pending')),
  cac_designation boolean not null default false,

  -- Coin details (populated from API or manual entry)
  coin_name text,
  year integer,
  mint_mark text,
  denomination text,
  composition text,
  population_at_grade integer,
  population_above integer,
  grading_service_image_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table listings enable row level security;

create policy "Active listings viewable by everyone"
  on listings for select using (status = 'active' or seller_id = auth.uid());

create policy "Sellers can insert their own listings"
  on listings for insert with check (auth.uid() = seller_id);

create policy "Sellers can update their own listings"
  on listings for update using (auth.uid() = seller_id);

-- ─── AUCTIONS ────────────────────────────────────────────────────────────────
create table auctions (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade unique,
  start_price integer not null, -- in cents
  current_bid integer not null, -- in cents, starts at start_price
  reserve_price integer, -- in cents, optional
  start_time timestamptz not null,
  end_time timestamptz not null,
  bid_count integer not null default 0,
  high_bidder_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table auctions enable row level security;

-- Authenticated users see current_bid; unauthenticated users see nothing for bids
create policy "Authenticated users can view auctions"
  on auctions for select using (auth.uid() is not null);

-- Unauthenticated: can see auction exists but not bid amounts (handled in app layer)
create policy "Unauthenticated users can view auction existence"
  on auctions for select using (true);

-- ─── BIDS ────────────────────────────────────────────────────────────────────
create table bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_id uuid not null references profiles(id) on delete cascade,
  amount integer not null, -- in cents
  created_at timestamptz not null default now()
);

alter table bids enable row level security;

create policy "Authenticated users can view bids"
  on bids for select using (auth.uid() is not null);

create policy "Authenticated users can place bids"
  on bids for insert with check (auth.uid() = bidder_id);

-- ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  amount integer not null, -- in cents
  stripe_payment_intent_id text unique not null,
  status text not null default 'pending' check (status in ('pending', 'held', 'released', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table transactions enable row level security;

create policy "Buyers and sellers can view their own transactions"
  on transactions for select using (
    auth.uid() = buyer_id or auth.uid() = seller_id
  );

-- ─── WANT LIST ───────────────────────────────────────────────────────────────
create table want_list (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  coin_name text not null,
  year integer,
  mint_mark text,
  grading_service text check (grading_service in ('PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS')),
  min_grade text,
  max_price integer, -- in cents
  notes text,
  created_at timestamptz not null default now()
);

alter table want_list enable row level security;

create policy "Users can manage their own want list"
  on want_list for all using (auth.uid() = user_id);

-- ─── PRICE HISTORY ───────────────────────────────────────────────────────────
create table price_history (
  id uuid primary key default uuid_generate_v4(),
  coin_name text not null,
  year integer,
  mint_mark text,
  grading_service text not null,
  grade text not null,
  sale_price integer not null, -- in cents
  sale_date timestamptz not null default now(),
  listing_id uuid references listings(id)
);

alter table price_history enable row level security;

create policy "Price history viewable by authenticated users"
  on price_history for select using (auth.uid() is not null);

-- ─── ADDRESSES ───────────────────────────────────────────────────────────────
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  street1 text not null,
  street2 text,
  city text not null,
  state text not null,
  zip text not null,
  country text not null default 'US',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;

create policy "Users can manage their own addresses"
  on addresses for all using (auth.uid() = user_id);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
-- Orders are created when a purchase is completed (fixed price or won auction)
create table orders (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) unique,
  listing_id uuid not null references listings(id),
  buyer_id uuid not null references profiles(id),
  seller_id uuid not null references profiles(id),
  amount integer not null, -- in cents
  -- Snapshot of buyer shipping address at time of purchase
  ship_to_name text not null,
  ship_to_street1 text not null,
  ship_to_street2 text,
  ship_to_city text not null,
  ship_to_state text not null,
  ship_to_zip text not null,
  ship_to_country text not null default 'US',
  status text not null default 'awaiting_shipment'
    check (status in ('awaiting_shipment', 'label_purchased', 'shipped', 'delivered', 'disputed', 'complete')),
  -- Auto-confirm delivery after this time if buyer doesn't dispute
  auto_confirm_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders enable row level security;

create policy "Buyers and sellers can view their own orders"
  on orders for select using (
    auth.uid() = buyer_id or auth.uid() = seller_id
  );

create policy "System can insert orders"
  on orders for insert with check (true);

create policy "System can update orders"
  on orders for update using (true);

-- ─── SHIPMENTS ───────────────────────────────────────────────────────────────
create table shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade unique,
  -- Shippo IDs
  shippo_shipment_id text,
  shippo_transaction_id text, -- the label purchase transaction
  -- Carrier & tracking
  carrier text not null,         -- e.g. 'USPS', 'UPS', 'FedEx'
  service_level text not null,   -- e.g. 'Priority Mail', 'Ground'
  tracking_number text,
  tracking_url text,
  tracking_status text not null default 'pre_transit'
    check (tracking_status in ('pre_transit', 'transit', 'delivered', 'returned', 'failure', 'unknown')),
  -- Label
  label_url text,                -- PDF label URL from Shippo
  label_purchased_at timestamptz,
  -- Insurance
  insured boolean not null default false,
  insured_value integer,         -- in cents
  insurance_cost integer,        -- in cents
  -- Dimensions & weight used for rate quote
  weight_oz numeric,
  length_in numeric,
  width_in numeric,
  height_in numeric,
  -- Rate selected
  rate_amount integer,           -- in cents
  -- Estimated delivery
  estimated_delivery_date date,
  -- Timestamps
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table shipments enable row level security;

create policy "Buyers and sellers can view their own shipments"
  on shipments for select using (
    exists (
      select 1 from orders
      where orders.id = shipments.order_id
        and (orders.buyer_id = auth.uid() or orders.seller_id = auth.uid())
    )
  );

create policy "System can manage shipments"
  on shipments for all using (true);

-- Enable realtime for order/shipment tracking
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table shipments;

-- ─── REALTIME ────────────────────────────────────────────────────────────────
-- Enable realtime for auction bidding
alter publication supabase_realtime add table auctions;
alter publication supabase_realtime add table bids;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index listings_seller_id_idx on listings(seller_id);
create index listings_status_idx on listings(status);
create index listings_grading_service_idx on listings(grading_service);
create index listings_year_idx on listings(year);
create index bids_auction_id_idx on bids(auction_id);
create index bids_bidder_id_idx on bids(bidder_id);
create index price_history_coin_name_idx on price_history(coin_name, grade);
create index want_list_user_id_idx on want_list(user_id);
create index orders_buyer_id_idx on orders(buyer_id);
create index orders_seller_id_idx on orders(seller_id);
create index orders_status_idx on orders(status);
create index shipments_order_id_idx on shipments(order_id);
create index shipments_tracking_number_idx on shipments(tracking_number);
create index addresses_user_id_idx on addresses(user_id);
