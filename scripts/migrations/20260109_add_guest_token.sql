-- Migration: Add guest token and delivery/return fields to rental_bills
-- Created at: 2026-01-09

ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "guestToken" varchar(255);
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "guestTokenExpiresAt" timestamptz;
CREATE INDEX IF NOT EXISTS "IDX_rental_bills_guestToken" ON "rental_bills" ("guestToken");

ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "deliveryLatitudeOwner" decimal(10,7);
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "deliveryLongitudeOwner" decimal(10,7);
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "deliveryDate" timestamp;
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "returnDate" timestamp;
