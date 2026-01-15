-- Migration: Remove redundant district fields from cooperations table
-- Date: 2026-01-15

-- 1. Remove districtId, provinceId, and district columns
ALTER TABLE "cooperations" DROP COLUMN IF EXISTS "districtId";
ALTER TABLE "cooperations" DROP COLUMN IF EXISTS "provinceId";
ALTER TABLE "cooperations" DROP COLUMN IF EXISTS "district";

-- 2. Ensure latitude and longitude are preserved (this is just a precaution, they are not being dropped)
-- ALTER TABLE "cooperations" ALTER COLUMN "latitude" TYPE decimal(10, 7);
-- ALTER TABLE "cooperations" ALTER COLUMN "longitude" TYPE decimal(10, 7);

-- NOTE: TypeORM synchronize: true might attempt to recreate these columns if the Entity is not updated yet.
-- Please ensure the Cooperation Entity in the code is updated before running this or restarting the server.
