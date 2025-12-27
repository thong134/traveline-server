-- Drop per-user like table and rely on aggregated favourites
-- 1) Remove legacy likes table if it exists
DROP TABLE IF EXISTS travel_route_likes CASCADE;

-- 2) Ensure favouriteTimes column exists and backfill from users' favorites
ALTER TABLE travel_routes
  ADD COLUMN IF NOT EXISTS "favouriteTimes" int NOT NULL DEFAULT 0;

-- 3) Recalculate favouriteTimes from users.favoriteTravelRouteIds array
UPDATE travel_routes AS tr
SET favouriteTimes = sub.cnt
FROM (
  SELECT tr2.id AS route_id, COUNT(*) AS cnt
  FROM travel_routes tr2
  JOIN users u ON u."favoriteTravelRouteIds" @> ARRAY[tr2.id::text]
  GROUP BY tr2.id
) AS sub
WHERE tr.id = sub.route_id;
