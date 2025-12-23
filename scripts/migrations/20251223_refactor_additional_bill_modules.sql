-- Migration: Refactor Hotel, Delivery, and Restaurant Bill Modules
-- Date: 2024-12-23
-- Description: Align logic with Rental Bill (remove redundant fields, quantity from details)

-- Hotel Bill
ALTER TABLE hotel_bill_details DROP COLUMN IF EXISTS "quantity";
ALTER TABLE hotel_bills DROP COLUMN IF EXISTS "contactEmail";
ALTER TABLE hotel_bills DROP COLUMN IF EXISTS "statusReason";

-- Delivery Bill
ALTER TABLE delivery_bills DROP COLUMN IF EXISTS "contactEmail";
ALTER TABLE delivery_bills DROP COLUMN IF EXISTS "statusReason";

-- Restaurant Booking
ALTER TABLE restaurant_bookings DROP COLUMN IF EXISTS "contactEmail";
ALTER TABLE restaurant_bookings DROP COLUMN IF EXISTS "statusReason";
