-- Migration: Fix Rental Vehicle Availability Enum
-- Description: Ensure 'available', 'unavailable', and 'maintenance' exist in rental_vehicles_availability_enum

-- Adding values to an ENUM cannot be done inside a transaction block in Postgres < 12 
-- but we are likely using a script runner. 
-- The following safest way for script runners that might use transactions:

ALTER TYPE rental_vehicles_availability_enum ADD VALUE IF NOT EXISTS 'available';
ALTER TYPE rental_vehicles_availability_enum ADD VALUE IF NOT EXISTS 'unavailable';
ALTER TYPE rental_vehicles_availability_enum ADD VALUE IF NOT EXISTS 'maintenance';
