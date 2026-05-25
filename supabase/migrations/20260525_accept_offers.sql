alter table listings
  add column if not exists accept_offers boolean not null default false;
