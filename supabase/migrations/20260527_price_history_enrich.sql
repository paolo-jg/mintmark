ALTER TABLE price_history
  ADD COLUMN IF NOT EXISTS denomination text,
  ADD COLUMN IF NOT EXISTS series_slug text,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id);

CREATE INDEX IF NOT EXISTS price_history_series_slug_idx
  ON price_history(series_slug, year, mint_mark, grading_service, grade, sale_date);

CREATE INDEX IF NOT EXISTS price_history_coin_fingerprint_idx
  ON price_history(coin_name, year, mint_mark, grading_service, grade, sale_date);

GRANT SELECT ON public.price_history TO service_role;
GRANT INSERT ON public.price_history TO service_role;
