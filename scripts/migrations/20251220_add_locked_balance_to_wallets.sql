-- Migration: Add locked_balance to user_wallets
-- This column tracks funds held in escrow for pending rentals

ALTER TABLE user_wallets
ADD COLUMN IF NOT EXISTS locked_balance DECIMAL(18, 2) NOT NULL DEFAULT '0.00';

-- Also add new transaction types to the enum if using PostgreSQL enum type
-- If using string column, no change needed as TypeORM handles it

COMMENT ON COLUMN user_wallets.locked_balance IS 'Funds locked for pending rental escrows';
