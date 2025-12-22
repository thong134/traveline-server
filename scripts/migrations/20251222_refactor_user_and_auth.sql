-- Migration: Refactor User and Auth Modules
-- Date: 2025-12-22
-- Description: Add isCitizenIdVerified column, drop name and dayParticipation columns from user table

-- Add isCitizenIdVerified column
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isCitizenIdVerified" BOOLEAN NOT NULL DEFAULT false;

-- Drop redundant name column (replaced by fullName)
ALTER TABLE "user" DROP COLUMN IF EXISTS "name";

-- Drop redundant dayParticipation column (redundant with createdAt)
ALTER TABLE "user" DROP COLUMN IF EXISTS "dayParticipation";
