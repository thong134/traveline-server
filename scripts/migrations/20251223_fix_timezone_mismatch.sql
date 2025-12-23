-- Migration: Fix Timezone Mismatch for Timestamps
-- Date: 2024-12-23
-- Description: Convert createdAt and updatedAt to timestamptz for accurate timeout calculations

-- Rental Bills
ALTER TABLE rental_bills ALTER COLUMN "createdAt" TYPE timestamptz;
ALTER TABLE rental_bills ALTER COLUMN "updatedAt" TYPE timestamptz;

-- Hotel Bills
ALTER TABLE hotel_bills ALTER COLUMN "createdAt" TYPE timestamptz;
ALTER TABLE hotel_bills ALTER COLUMN "updatedAt" TYPE timestamptz;

-- Delivery Bills
ALTER TABLE delivery_bills ALTER COLUMN "createdAt" TYPE timestamptz;
ALTER TABLE delivery_bills ALTER COLUMN "updatedAt" TYPE timestamptz;

-- Restaurant Bookings
ALTER TABLE restaurant_bookings ALTER COLUMN "createdAt" TYPE timestamptz;
ALTER TABLE restaurant_bookings ALTER COLUMN "updatedAt" TYPE timestamptz;
