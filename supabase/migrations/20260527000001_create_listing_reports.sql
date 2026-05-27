create table if not exists listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id),
  reason text not null check (reason in ('fraud','wrong_description','counterfeit','price_manipulation','other')),
  details text,
  created_at timestamptz default now(),
  unique(listing_id, reporter_id)
);
alter table listing_reports enable row level security;
create policy "reporters can insert" on listing_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reporters can view own" on listing_reports for select to authenticated using (reporter_id = auth.uid());
grant select, insert on listing_reports to authenticated;
