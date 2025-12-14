BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
END
$$;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

UPDATE "user"
SET role = 'user'
WHERE role IS NULL;

COMMIT;
