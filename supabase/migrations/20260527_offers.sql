CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id uuid REFERENCES auth.users(id) NOT NULL,
  seller_id uuid REFERENCES auth.users(id) NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'countered', 'expired', 'cancelled')),
  counter_amount_cents integer,
  message text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers can see their offers" ON offers
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "sellers can see offers on their listings" ON offers
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "buyers can create offers" ON offers
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "buyers and sellers can update their offers" ON offers
  FOR UPDATE USING (buyer_id = auth.uid() OR seller_id = auth.uid());
