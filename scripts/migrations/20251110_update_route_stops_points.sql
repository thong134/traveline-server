BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'route_stop_status_enum'
  ) THEN
    CREATE TYPE route_stop_status_enum AS ENUM (
      'upcoming',
      'in_progress',
      'completed',
      'missed'
    );
  END IF;
END;
$$;

ALTER TABLE IF EXISTS route_stops
  ADD COLUMN IF NOT EXISTS status route_stop_status_enum DEFAULT 'upcoming';

ALTER TABLE IF EXISTS route_stops
  ADD COLUMN IF NOT EXISTS "travelPoints" integer DEFAULT 0;

UPDATE route_stops SET status = 'upcoming' WHERE status IS NULL;
UPDATE route_stops SET "travelPoints" = 0 WHERE "travelPoints" IS NULL;

ALTER TABLE IF EXISTS travel_routes
  ADD COLUMN IF NOT EXISTS "totalTravelPoints" integer DEFAULT 0;

ALTER TABLE IF EXISTS travel_routes
  ADD COLUMN IF NOT EXISTS "averageRating" double precision DEFAULT 0;

COMMIT;
