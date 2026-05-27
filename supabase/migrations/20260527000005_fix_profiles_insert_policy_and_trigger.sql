-- ── 1. Add missing INSERT policy on profiles ─────────────────────────────────
-- Without this, the on_auth_user_created trigger's INSERT fails even with
-- SECURITY DEFINER because there is no INSERT policy and RLS is enabled.
-- The profile ID is a FK to auth.users so arbitrary injection is not possible.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Service can create profiles'
  ) THEN
    CREATE POLICY "Service can create profiles"
      ON profiles FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ── 2. Robust trigger with proper search_path, NULL-safe username, uniqueness ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  counter       int := 0;
BEGIN
  -- Derive and sanitize username: keep only [a-z0-9_], lowercase
  base_username := lower(regexp_replace(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      split_part(new.email, '@', 1)
    ),
    '[^a-z0-9_]', '', 'g'
  ));

  -- Ensure at least 3 characters
  IF base_username IS NULL OR length(base_username) < 3 THEN
    base_username := coalesce(base_username, '') || 'user';
  END IF;

  -- Cap at 25 chars to leave room for numeric suffix
  base_username := left(base_username, 25);

  -- Find a unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, username)
  VALUES (new.id, new.email, final_username);

  RETURN new;
END;
$$;
