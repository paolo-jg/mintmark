alter table profiles
  add column if not exists display_name text,
  add column if not exists dealer_logo_url text,
  add column if not exists dealer_description text,
  add column if not exists average_rating numeric(3,2) not null default 0,
  add column if not exists rating_count int not null default 0;
