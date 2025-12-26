-- Migration: Update Travel Route Public/Sharing Logic
-- Description: Adds isPublic and isEdited to travel_routes, removes userUid from feedbacks

-- 1. Add columns to travel_routes
ALTER TABLE travel_routes ADD COLUMN IF NOT EXISTS "isPublic" boolean DEFAULT false;
ALTER TABLE travel_routes ADD COLUMN IF NOT EXISTS "isEdited" boolean DEFAULT false;

-- 2. Remove column from feedbacks
ALTER TABLE feedbacks DROP COLUMN IF EXISTS "userUid";
