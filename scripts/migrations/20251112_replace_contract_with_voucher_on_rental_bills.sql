ALTER TABLE "rental_bills"
  ADD COLUMN IF NOT EXISTS "voucherId" integer;

UPDATE "rental_bills" rb
SET "voucherId" = v.id
FROM "vouchers" v
WHERE rb."voucherCode" = v.code
  AND rb."voucherCode" IS NOT NULL
  AND rb."voucherId" IS NULL;

CREATE INDEX IF NOT EXISTS "IDX_rental_bills_voucherId"
  ON "rental_bills" ("voucherId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'FK_rental_bills_voucher'
      AND tc.table_name = 'rental_bills'
  ) THEN
    ALTER TABLE "rental_bills"
      ADD CONSTRAINT "FK_rental_bills_voucher"
      FOREIGN KEY ("voucherId")
      REFERENCES "vouchers" ("id")
      ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE "rental_bills"
  DROP COLUMN IF EXISTS "contractId";

ALTER TABLE "rental_bills"
  DROP COLUMN IF EXISTS "voucherCode";
