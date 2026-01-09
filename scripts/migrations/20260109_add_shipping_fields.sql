-- Migration: Add coordinate and shipping fee fields
-- Created at: 2026-01-09

-- 1. Update RentalContract table
ALTER TABLE "rental_contracts" ADD COLUMN IF NOT EXISTS "businessLatitude" decimal(10,7);
ALTER TABLE "rental_contracts" ADD COLUMN IF NOT EXISTS "businessLongitude" decimal(10,7);

-- 2. Update RentalBill table
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "pickupLatitude" decimal(10,7);
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "pickupLongitude" decimal(10,7);
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "shippingFee" decimal(12,2) DEFAULT 0;
ALTER TABLE "rental_bills" ADD COLUMN IF NOT EXISTS "isShippingFeeNegotiable" boolean DEFAULT false;
