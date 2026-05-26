ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_tos_agreed boolean NOT NULL DEFAULT false;
