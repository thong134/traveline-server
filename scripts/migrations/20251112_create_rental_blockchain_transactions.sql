CREATE TABLE IF NOT EXISTS rental_blockchain_transactions (
  id SERIAL PRIMARY KEY,
  "rentalId" INTEGER NOT NULL,
  "txHash" VARCHAR(66) NOT NULL,
  "fromAddress" VARCHAR(42) NOT NULL,
  "toAddress" VARCHAR(42) NOT NULL,
  "transactionType" VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  "amountWei" NUMERIC(78, 0) NOT NULL DEFAULT 0,
  "amountEth" NUMERIC(26, 18) NOT NULL DEFAULT 0,
  "errorReason" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rental_blockchain_transactions_rental_id_idx
  ON rental_blockchain_transactions ("rentalId");

CREATE INDEX IF NOT EXISTS rental_blockchain_transactions_tx_hash_idx
  ON rental_blockchain_transactions ("txHash");
