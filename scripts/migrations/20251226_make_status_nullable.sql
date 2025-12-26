-- Migration: Make Status Columns Nullable
-- Description: Allows TravelRoute and RouteStop statuses to be null for public clones

ALTER TABLE "travel_routes" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "route_stops" ALTER COLUMN "status" DROP NOT NULL;
