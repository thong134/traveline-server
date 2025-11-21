BEGIN;

CREATE TABLE IF NOT EXISTS user_wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
  amount NUMERIC(18, 2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  reference_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx
  ON wallet_transactions(wallet_id);

CREATE INDEX IF NOT EXISTS wallet_transactions_reference_id_idx
  ON wallet_transactions(reference_id);

COMMIT;
