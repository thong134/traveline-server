-- Migration: Add vehicleType to RentalVehicle and RentalBill
-- Description: Adds 'bike' and 'car' types

-- 1. Create enum type
DO $$ BEGIN
    CREATE TYPE rental_vehicle_type_enum AS ENUM ('bike', 'car');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add column to rental_vehicles
ALTER TABLE rental_vehicles ADD COLUMN IF NOT EXISTS "vehicleType" rental_vehicle_type_enum DEFAULT 'bike';

-- 3. Add column to rental_bills
ALTER TABLE rental_bills ADD COLUMN IF NOT EXISTS "vehicleType" rental_vehicle_type_enum DEFAULT 'bike';

-- 4. Add durationPackage column to rental_bills to store the selected package
ALTER TABLE rental_bills ADD COLUMN IF NOT EXISTS "durationPackage" varchar(32) DEFAULT '1d';
