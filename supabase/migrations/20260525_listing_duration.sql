-- null = Good 'til Canceled, integer = number of days active
alter table listings
  add column if not exists listing_duration_days integer;
