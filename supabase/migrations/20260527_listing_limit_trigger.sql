-- Enforce per-tier monthly listing limits server-side
CREATE OR REPLACE FUNCTION check_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_month_start timestamptz;
  v_active_count integer;
BEGIN
  -- Only enforce on active listings being inserted
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT subscription_tier INTO v_tier
  FROM profiles
  WHERE id = NEW.seller_id;

  -- Set tier limit (null = unlimited)
  v_limit := CASE v_tier
    WHEN 'collector_basic'   THEN 10
    WHEN 'collector_premium' THEN 50
    ELSE NULL  -- dealer = unlimited
  END;

  -- No limit for this tier
  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  v_month_start := date_trunc('month', now());

  SELECT COUNT(*) INTO v_active_count
  FROM listings
  WHERE seller_id = NEW.seller_id
    AND status = 'active'
    AND (
      -- carry-over: active listings created before this month
      created_at < v_month_start
      OR
      -- created this month
      created_at >= v_month_start
    );

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly listing limit of % reached for % plan', v_limit, v_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_listing_limit ON listings;
CREATE TRIGGER enforce_listing_limit
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION check_listing_limit();
