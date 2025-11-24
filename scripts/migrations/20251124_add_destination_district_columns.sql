BEGIN;

ALTER TABLE IF EXISTS destinations
  ADD COLUMN IF NOT EXISTS "district" varchar(255);

ALTER TABLE IF EXISTS destinations
  ADD COLUMN IF NOT EXISTS "districtCode" varchar(50);

ALTER TABLE IF EXISTS destination
  ADD COLUMN IF NOT EXISTS "district" varchar(255);

ALTER TABLE IF EXISTS destination
  ADD COLUMN IF NOT EXISTS "districtCode" varchar(50);

COMMIT;
