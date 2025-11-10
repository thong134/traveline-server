BEGIN;

ALTER TABLE IF EXISTS feedbacks DROP COLUMN IF EXISTS "feedbackDate";

UPDATE feedbacks
SET "cooperationId" = NULL
WHERE "cooperationId" IS NOT NULL
  AND TRIM(COALESCE("cooperationId"::text, '')) = '';

ALTER TABLE IF EXISTS feedbacks
  ALTER COLUMN "cooperationId" TYPE integer USING "cooperationId"::integer;

ALTER TABLE IF EXISTS feedbacks DROP CONSTRAINT IF EXISTS feedbacks_licensePlate_fkey;
ALTER TABLE IF EXISTS feedbacks DROP CONSTRAINT IF EXISTS feedbacks_licenseplate_fkey;
ALTER TABLE IF EXISTS feedbacks DROP CONSTRAINT IF EXISTS feedbacks_cooperationId_fkey;
ALTER TABLE IF EXISTS feedbacks DROP CONSTRAINT IF EXISTS feedbacks_cooperationid_fkey;

ALTER TABLE IF EXISTS feedbacks
  ADD CONSTRAINT feedbacks_license_plate_fk
  FOREIGN KEY ("licensePlate")
  REFERENCES rental_vehicles("licensePlate")
  ON DELETE SET NULL;

ALTER TABLE IF EXISTS feedbacks
  ADD CONSTRAINT feedbacks_cooperation_fk
  FOREIGN KEY ("cooperationId")
  REFERENCES cooperations(id)
  ON DELETE SET NULL;

COMMIT;
