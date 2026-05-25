alter table listings
  add column if not exists min_offer_amount   integer,        -- cents, null = no floor
  add column if not exists auto_accept_pct    integer,        -- cents, auto-accept offers at or above this amount
  add column if not exists auto_decline_pct   integer,        -- cents, auto-decline offers below this amount
  add column if not exists auction_bin_price  integer;        -- cents, null = no BIN on auction

alter table listings
  add column if not exists returns_accepted boolean not null default false;

alter table listings
  add column if not exists returns_policy_type   text check (returns_policy_type in ('standard', 'custom')),
  add column if not exists returns_policy_days   integer,
  add column if not exists returns_policy_custom text;
