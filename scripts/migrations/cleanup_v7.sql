-- Migrate data in cooperations before dropping columns
UPDATE cooperations 
SET 
  "representativeName" = COALESCE("representativeName", "bossName"),
  "representativePhone" = COALESCE("representativePhone", "bossPhone"),
  "representativeEmail" = COALESCE("representativeEmail", "bossEmail")
WHERE "bossName" IS NOT NULL OR "bossPhone" IS NOT NULL OR "bossEmail" IS NOT NULL;

-- Drop redundant columns from cooperations
ALTER TABLE cooperations 
DROP COLUMN IF EXISTS "numberOfObjects",
DROP COLUMN IF EXISTS "numberOfObjectTypes",
DROP COLUMN IF EXISTS "bossName",
DROP COLUMN IF EXISTS "bossPhone",
DROP COLUMN IF EXISTS "bossEmail",
DROP COLUMN IF EXISTS "district",
DROP COLUMN IF EXISTS "city",
DROP COLUMN IF EXISTS "province",
DROP COLUMN IF EXISTS "active";

-- Update destination table (TypeORM defaults to entity name 'destination')
ALTER TABLE destination
ADD COLUMN IF NOT EXISTS "hasTourTickets" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "tourPriceRange" VARCHAR,
ADD COLUMN IF NOT EXISTS "cooperationId" INTEGER;
