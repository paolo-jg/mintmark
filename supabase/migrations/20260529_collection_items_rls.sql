-- Enable RLS on collection_items and restrict to owner.
-- Service role bypasses RLS, so all API routes using SUPABASE_SERVICE_ROLE_KEY are unaffected.

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON collection_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owner_insert" ON collection_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_update" ON collection_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "owner_delete" ON collection_items
  FOR DELETE USING (auth.uid() = user_id);
