-- Auction payment hold infrastructure

-- Stripe customer ID for bidders (allows server-side PaymentIntent creation)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Track hold state per bid
ALTER TABLE bids ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS hold_status text NOT NULL DEFAULT 'pending'
  CHECK (hold_status IN ('pending', 'held', 'captured', 'cancelled', 'failed'));

-- Auction lifecycle state
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'ended', 'settled', 'cancelled'));
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Index for cron: find active auctions past end_time
CREATE INDEX IF NOT EXISTS idx_auctions_status_end_time ON auctions(status, end_time);
-- Index for finding bids to cancel when outbid
CREATE INDEX IF NOT EXISTS idx_bids_auction_bidder ON bids(auction_id, bidder_id);
