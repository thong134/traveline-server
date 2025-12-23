-- Migration: Refine Payment Methods and Totals
-- Description: Implement PaymentMethod enum and update billing tables

-- Create Payment Method Enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM ('wallet', 'momo', 'qr_code');
    END IF;
END $$;

-- Update Rental Bills
ALTER TABLE rental_bills 
  ALTER COLUMN "paymentMethod" TYPE payment_method_enum 
  USING (CASE 
    WHEN "paymentMethod" = 'wallet' THEN 'wallet'::payment_method_enum
    WHEN "paymentMethod" = 'momo' THEN 'momo'::payment_method_enum
    WHEN "paymentMethod" = 'qr_code' THEN 'qr_code'::payment_method_enum
    ELSE NULL 
  END);

-- Update Hotel Bills
ALTER TABLE hotel_bills 
  ALTER COLUMN "paymentMethod" TYPE payment_method_enum 
  USING (CASE 
    WHEN "paymentMethod" = 'wallet' THEN 'wallet'::payment_method_enum
    WHEN "paymentMethod" = 'momo' THEN 'momo'::payment_method_enum
    WHEN "paymentMethod" = 'qr_code' THEN 'qr_code'::payment_method_enum
    ELSE NULL 
  END);

-- Update Delivery Bills
ALTER TABLE delivery_bills 
  ALTER COLUMN "paymentMethod" TYPE payment_method_enum 
  USING (CASE 
    WHEN "paymentMethod" = 'wallet' THEN 'wallet'::payment_method_enum
    WHEN "paymentMethod" = 'momo' THEN 'momo'::payment_method_enum
    WHEN "paymentMethod" = 'qr_code' THEN 'qr_code'::payment_method_enum
    ELSE NULL 
  END);
