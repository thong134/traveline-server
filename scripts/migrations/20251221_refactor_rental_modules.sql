-- Migration: Refactor Rental Modules
-- Date: 2024-12-21
-- Description: Remove contractTerm from rental_contracts, add pricing tiers to rental_vehicles

-- Remove contractTerm from rental_contracts
ALTER TABLE rental_contracts DROP COLUMN IF EXISTS "contractTerm";

-- Add pricing tier columns to rental_vehicles
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor4Hours" DECIMAL(12, 2);
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor8Hours" DECIMAL(12, 2);
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor12Hours" DECIMAL(12, 2);
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor2Days" DECIMAL(12, 2);
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor3Days" DECIMAL(12, 2);
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor5Days" DECIMAL(12, 2);
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "priceFor7Days" DECIMAL(12, 2);

-- Update default availability for rental_vehicles (new vehicles will be unavailable by default)
ALTER TABLE rental_vehicles ALTER COLUMN availability SET DEFAULT 'unavailable';
