BEGIN;

-- Drop existing foreign keys pointing to vehicle_information
DO $$
DECLARE
  constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'rental_vehicles'::regclass
      AND confrelid = 'vehicle_information'::regclass
  LOOP
    EXECUTE format('ALTER TABLE rental_vehicles DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END;
$$;

-- Rename the foreign key column to the new naming convention
ALTER TABLE IF EXISTS rental_vehicles
  RENAME COLUMN "vehicleInformationId" TO "vehicleCatalogId";

-- Rename the base table and its backing sequence
ALTER TABLE IF EXISTS vehicle_information RENAME TO vehicle_catalog;
ALTER SEQUENCE IF EXISTS vehicle_information_id_seq RENAME TO vehicle_catalog_id_seq;

-- Prune legacy columns no longer represented in the entity model
ALTER TABLE IF EXISTS vehicle_catalog
  DROP COLUMN IF EXISTS "externalId",
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "defaultRequirements",
  DROP COLUMN IF EXISTS "defaultPricePerHour",
  DROP COLUMN IF EXISTS "defaultPricePerDay",
  DROP COLUMN IF EXISTS "active";

-- Ensure default values align with the new entity definitions
ALTER TABLE IF EXISTS vehicle_catalog
  ALTER COLUMN "seatingCapacity" SET DEFAULT 0;

-- Recreate the foreign key with the updated table name
ALTER TABLE IF EXISTS rental_vehicles
  ADD CONSTRAINT rental_vehicles_vehicle_catalog_id_fk
  FOREIGN KEY ("vehicleCatalogId")
  REFERENCES vehicle_catalog(id)
  ON DELETE SET NULL;

COMMIT;
