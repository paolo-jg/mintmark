ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS requires_plan_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS listing_count_reset_at timestamptz;

-- Update listing limit trigger to respect listing_count_reset_at.
-- After a downgrade, listings created before the reset timestamp are grandfathered
-- and don't count against the new tier limit.
CREATE OR REPLACE FUNCTION check_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_reset_at timestamptz;
  v_count_from timestamptz;
  v_active_count integer;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT subscription_tier, listing_count_reset_at
  INTO v_tier, v_reset_at
  FROM profiles
  WHERE id = NEW.seller_id;

  v_limit := CASE v_tier
    WHEN 'collector_basic'   THEN 10
    WHEN 'collector_premium' THEN 50
    ELSE NULL
  END;

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use the later of: month start, or listing_count_reset_at (if set).
  -- This grandfathers listings made before a downgrade, while still
  -- applying a monthly reset after the first partial month post-downgrade.
  v_count_from := GREATEST(
    date_trunc('month', now()),
    COALESCE(v_reset_at, '-infinity'::timestamptz)
  );

  SELECT COUNT(*) INTO v_active_count
  FROM listings
  WHERE seller_id = NEW.seller_id
    AND status = 'active'
    AND created_at >= v_count_from;

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly listing limit of % reached for % plan', v_limit, v_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
