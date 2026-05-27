-- Add public_key to profiles
alter table profiles add column if not exists public_key text;

-- Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  buyer_key_encrypted text not null,
  seller_key_encrypted text not null,
  last_message_at timestamptz,
  buyer_unread int not null default 0,
  seller_unread int not null default 0,
  created_at timestamptz default now(),
  unique(listing_id, buyer_id)
);
alter table conversations enable row level security;
create policy "participants can view" on conversations for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "buyers can create" on conversations for insert to authenticated
  with check (buyer_id = auth.uid());
create policy "participants can update" on conversations for update to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());
grant select, insert, update on conversations to authenticated;

-- Messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  content_encrypted text not null,
  iv text not null,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "participants can view messages" on messages for select to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
create policy "participants can send messages" on messages for insert to authenticated
  with check (
    sender_id = auth.uid() and
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
grant select, insert on messages to authenticated;
