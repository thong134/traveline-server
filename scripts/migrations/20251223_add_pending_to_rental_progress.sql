-- Migration: Add 'pending' to Rental Progress Status
-- Description: Adds 'pending' value to enum and sets as default

-- Add 'pending' value to the enum (must be done outside a transaction in some environments)
ALTER TYPE rental_progress_status_enum ADD VALUE IF NOT EXISTS 'pending' BEFORE 'booked';

-- Update default value for rentalStatus in rental_bills
ALTER TABLE rental_bills ALTER COLUMN "rentalStatus" SET DEFAULT 'pending';
