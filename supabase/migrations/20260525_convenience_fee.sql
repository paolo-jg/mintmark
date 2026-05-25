alter table listings
  add column if not exists pass_convenience_fee boolean not null default false;
