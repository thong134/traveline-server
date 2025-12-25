-- Migration: Normalize vehicle_catalog.type values and drop vehicleType column
-- Purpose: Convert Vietnamese labels to canonical values and remove redundant vehicleType column/enum

-- 1) Normalize type values
UPDATE vehicle_catalog
SET type = 'car'
WHERE trim(lower(type)) IN ('ô tô', 'o to', 'oto', 'ôto', 'o tô', 'ô tô');

UPDATE vehicle_catalog
SET type = 'bike'
WHERE trim(lower(type)) IN ('xe máy', 'xe may', 'xemay', 'xe-may');

-- 2) Drop redundant vehicleType column
ALTER TABLE vehicle_catalog DROP COLUMN IF EXISTS "vehicleType";

-- 3) Drop the enum type that backed vehicleType (handle common generated names)
DO $$
DECLARE
    enum_name text;
BEGIN
    FOR enum_name IN
        SELECT typname
        FROM pg_type
        WHERE typname IN (
            'vehicle_catalog_vehicleType_enum',
            'vehicle_catalog_vehicletype_enum'
        )
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I', enum_name);
    END LOOP;
END $$;
