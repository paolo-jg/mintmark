-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  reviewer_id     uuid REFERENCES auth.users(id) NOT NULL,
  seller_id       uuid REFERENCES auth.users(id) NOT NULL,
  rating          integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           text CHECK (char_length(title) <= 120),
  body            text CHECK (char_length(body) <= 1000),
  status          text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'flagged', 'removed')),
  flag_reason     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS reviews_seller_id_idx ON reviews (seller_id);
CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON reviews (reviewer_id);

-- Track completed orders on profiles for ranking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_orders_count integer NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published + flagged reviews (flagged show with a note)
CREATE POLICY "reviews_read_public"
  ON reviews FOR SELECT
  USING (status IN ('published', 'flagged'));

-- Reviewer can always read their own reviews
CREATE POLICY "reviews_read_own"
  ON reviews FOR SELECT
  USING (reviewer_id = auth.uid());

-- Buyer can submit a review for their own completed order
CREATE POLICY "reviews_insert"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.buyer_id = auth.uid()
        AND orders.status = 'complete'
    )
  );

-- Reviewer can update (edit) their review within 7 days
CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  USING (
    reviewer_id = auth.uid()
    AND created_at > now() - interval '7 days'
  );

-- Any authenticated user can flag (sets status to 'flagged')
-- Enforced at the API level; RLS only allows the reviewer to update otherwise
CREATE POLICY "reviews_flag"
  ON reviews FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'published')
  WITH CHECK (status = 'flagged');

-- ── Trigger: keep profiles.average_rating + rating_count in sync ──────────────

CREATE OR REPLACE FUNCTION sync_seller_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_seller uuid;
BEGIN
  target_seller := COALESCE(NEW.seller_id, OLD.seller_id);
  UPDATE profiles
  SET
    average_rating = COALESCE((
      SELECT AVG(rating)::numeric(3,2)
      FROM reviews
      WHERE seller_id = target_seller
        AND status = 'published'
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE seller_id = target_seller
        AND status = 'published'
    )
  WHERE id = target_seller;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_seller_rating ON reviews;
CREATE TRIGGER trg_sync_seller_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION sync_seller_rating();

-- ── Trigger: keep profiles.completed_orders_count in sync ─────────────────────

CREATE OR REPLACE FUNCTION sync_completed_orders_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET completed_orders_count = (
    SELECT COUNT(*) FROM orders
    WHERE seller_id = NEW.seller_id AND status = 'complete'
  )
  WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_completed_orders ON orders;
CREATE TRIGGER trg_sync_completed_orders
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_completed_orders_count();
