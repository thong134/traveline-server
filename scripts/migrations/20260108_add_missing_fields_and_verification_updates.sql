-- Migration: Add missing fields for verification and address refinement
-- Date: 2026-01-08
-- Description: Add missing columns identified during verification refactor and address integration

-- 1. Updates for User table (Banking & Identity)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ethAddress" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "idCardImageUrl" TEXT;

-- 2. Updates for Destination table (Address Refinement)
ALTER TABLE "destination" ADD COLUMN IF NOT EXISTS "reformAddress" TEXT;

-- 3. Updates for Rental Bills table (Verification Photos)
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "verifiedSelfiePhoto" TEXT;
