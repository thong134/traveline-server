-- Migration: Remove businessProvince from rental_contracts
-- Created at: 2026-01-09

ALTER TABLE "rental_contracts" DROP COLUMN IF EXISTS "businessProvince";
