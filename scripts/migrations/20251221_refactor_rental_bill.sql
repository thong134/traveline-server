-- Migration: Refactor Rental Bill Module
-- Date: 2024-12-21
-- Description: Remove quantity from rental_bill_details, remove redundant fields from rental_bills

-- Remove quantity from rental_bill_details
ALTER TABLE rental_bill_details DROP COLUMN IF EXISTS "quantity";

-- Remove redundant fields from rental_bills
ALTER TABLE rental_bills DROP COLUMN IF EXISTS "contactEmail";
ALTER TABLE rental_bills DROP COLUMN IF EXISTS "statusReason";
ALTER TABLE rental_bills DROP COLUMN IF EXISTS "citizenBackPhoto";
