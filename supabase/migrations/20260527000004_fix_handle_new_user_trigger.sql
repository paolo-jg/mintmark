-- Robust handle_new_user trigger: sanitizes username, ensures uniqueness
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 0;
BEGIN
  -- Derive base from metadata username or email prefix, then sanitize:
  -- strip everything that isn't a-z, 0-9, or underscore, and lowercase
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    '[^a-z0-9_]', '', 'g'
  ));

  -- Ensure minimum length of 3
  IF length(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;

  -- Cap at 25 chars to leave room for a numeric suffix
  base_username := left(base_username, 25);

  -- Append incrementing counter until we find a unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO profiles (id, email, username)
  VALUES (new.id, new.email, final_username);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
