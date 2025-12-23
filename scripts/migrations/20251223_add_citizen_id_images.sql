-- Migration: Add citizen ID front/back images
-- Date: 2025-12-23
-- Description: Store front/back citizen ID images separately

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "citizenFrontImageUrl" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "citizenBackImageUrl" TEXT;
