-- Migration: Remove Travel Route Likes and Add Favourite Times
-- Description: Drops traffic_route_likes table and adds favouriteTimes column to travel_routes

DROP TABLE IF EXISTS "travel_route_likes";

ALTER TABLE "travel_routes" ADD COLUMN IF NOT EXISTS "favouriteTimes" integer DEFAULT 0;
