ALTER TABLE "travel_routes"
    ADD COLUMN IF NOT EXISTS "user_id" INT;

ALTER TABLE "travel_routes"
    ADD CONSTRAINT "FK_travel_routes_user_id"
    FOREIGN KEY ("user_id")
    REFERENCES "user"("id")
    ON DELETE SET NULL;
