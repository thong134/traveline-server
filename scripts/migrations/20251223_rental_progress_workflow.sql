-- Migration: Rental Progress Workflow
-- Description: Add rentalStatus and progress tracking fields to rental_bills

-- Create Rental Progress Status Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rental_progress_status_enum') THEN
        CREATE TYPE rental_progress_status_enum AS ENUM (
            'pending', 'booked', 'delivering', 'delivered', 'in_progress', 
            'return_requested', 'return_confirmed', 'cancelled'
        );
    END IF;
END $$;

-- Add columns to rental_bills
ALTER TABLE rental_bills 
  ADD COLUMN IF NOT EXISTS "rentalStatus" rental_progress_status_enum DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "deliveryPhotos" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "pickupSelfiePhoto" text,
  ADD COLUMN IF NOT EXISTS "returnPhotosUser" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "returnPhotosOwner" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "returnTimestampUser" timestamptz,
  ADD COLUMN IF NOT EXISTS "returnLatitudeUser" decimal(10, 7),
  ADD COLUMN IF NOT EXISTS "returnLongitudeUser" decimal(10, 7),
  ADD COLUMN IF NOT EXISTS "returnLatitudeOwner" decimal(10, 7),
  ADD COLUMN IF NOT EXISTS "returnLongitudeOwner" decimal(10, 7),
  ADD COLUMN IF NOT EXISTS "overtimeFee" decimal(12, 2) DEFAULT 0;
