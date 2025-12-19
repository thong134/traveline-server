ALTER TABLE "travel_routes"
    ADD COLUMN IF NOT EXISTS "cloned_from_route_id" INTEGER;

ALTER TABLE "travel_routes"
    ADD CONSTRAINT IF NOT EXISTS "fk_travel_routes_cloned_from"
    FOREIGN KEY ("cloned_from_route_id")
    REFERENCES "travel_routes"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_travel_routes_cloned_from"
    ON "travel_routes" ("cloned_from_route_id");
