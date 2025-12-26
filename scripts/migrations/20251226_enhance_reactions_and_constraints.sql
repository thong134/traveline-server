-- Migration: Enhance Reactions and Constraints
-- Description: Adds new favorite lists to users, drops feedback_likes

-- 1. Add new favorite columns to users
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "favoriteTravelRouteIds" text[] DEFAULT '{}';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "favoriteRentalVehicleIds" text[] DEFAULT '{}';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "favoriteCooperationIds" text[] DEFAULT '{}';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "favoriteEaterieIds" text[] DEFAULT '{}';

ALTER TABLE "feedbacks" ADD COLUMN IF NOT EXISTS "eateryId" integer;

-- 2. Drop deprecated feedback_likes table
DROP TABLE IF EXISTS "feedback_likes";

-- 3. Ensure feedback_reactions exists with correct schema if not already present
-- (Usually managed by TypeORM, but provided here for reference/completeness)
-- CREATE TYPE "feedback_reactions_type_enum" AS ENUM ('like', 'love');
-- CREATE TABLE IF NOT EXISTS "feedback_reactions" (
--   "id" SERIAL PRIMARY KEY,
--   "type" "feedback_reactions_type_enum" NOT NULL DEFAULT 'like',
--   "created_at" timestamptz NOT NULL DEFAULT now(),
--   "feedback_id" integer,
--   "user_id" integer,
--   CONSTRAINT "uq_feedback_reaction_feedback_id_user_id_type" UNIQUE ("feedback_id", "user_id", "type"),
--   CONSTRAINT "FK_feedback_reaction_feedback" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE,
--   CONSTRAINT "FK_feedback_reaction_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
-- );
