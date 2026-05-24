-- Add status column for owned coins
alter table collection_items
  add column if not exists status text not null default 'owned'
    check (status in ('owned', 'for_sale', 'sold'));
