DO $$
BEGIN
    CREATE TYPE travel_route_status AS ENUM ('draft', 'upcoming', 'in_progress', 'completed', 'missed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "travel_routes"
    ADD COLUMN IF NOT EXISTS "shared" BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS "status" travel_route_status NOT NULL DEFAULT 'draft';

UPDATE "travel_routes"
SET "status" = 'upcoming'
WHERE "status" IS NULL;

ALTER TABLE "destination"
    ADD COLUMN IF NOT EXISTS "openTime" VARCHAR(5),
    ADD COLUMN IF NOT EXISTS "closeTime" VARCHAR(5);

ALTER TABLE "route_stops"
    DROP COLUMN IF EXISTS "uniqueKey";

