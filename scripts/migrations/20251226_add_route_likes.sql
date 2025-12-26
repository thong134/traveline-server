-- Migration: Add Travel Route Likes
-- Description: Creates the travel_route_likes table for social proof

CREATE TABLE IF NOT EXISTS "travel_route_likes" (
  "id" SERIAL PRIMARY KEY,
  "user_id" integer NOT NULL,
  "travel_route_id" integer NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UQ_travel_route_likes_user_route" UNIQUE ("user_id", "travel_route_id"),
  CONSTRAINT "FK_travel_route_likes_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_travel_route_likes_route" FOREIGN KEY ("travel_route_id") REFERENCES "travel_routes"("id") ON DELETE CASCADE
);
