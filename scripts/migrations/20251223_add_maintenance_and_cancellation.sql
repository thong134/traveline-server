-- Migration: Add Maintenance and Cancellation fields
-- Description: Adds rental_vehicle_maintenance table and cancellation fields to rental_bills

-- 1. Add cancellation fields to rental_bills
CREATE TYPE rental_bill_cancelled_by_enum AS ENUM ('user', 'owner');
ALTER TABLE rental_bills ADD COLUMN IF NOT EXISTS "cancelReason" text;
ALTER TABLE rental_bills ADD COLUMN IF NOT EXISTS "cancelledBy" rental_bill_cancelled_by_enum;

-- 2. Add vehicleType to vehicle_catalog (standardize with rental_vehicles)
ALTER TABLE vehicle_catalog ADD COLUMN IF NOT EXISTS "vehicleType" rental_vehicle_type_enum DEFAULT 'bike';

-- 3. Create rental_vehicle_maintenance table
CREATE TABLE IF NOT EXISTS "rental_vehicle_maintenance" (
    "id" SERIAL PRIMARY KEY,
    "licensePlate" varchar(32) NOT NULL REFERENCES rental_vehicles("licensePlate") ON DELETE CASCADE,
    "startDate" timestamptz NOT NULL,
    "endDate" timestamptz NOT NULL,
    "reason" text,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- Index for performance in search
CREATE INDEX IF NOT EXISTS "idx_maintenance_vehicle_dates" ON "rental_vehicle_maintenance" ("licensePlate", "startDate", "endDate");
