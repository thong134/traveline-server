-- Migration: Remove uniqueness constraints for email, phone, and citizenId
-- Date: 2026-01-09
-- Description: Allow multiple accounts to share the same email, phone, or citizenId. Keep username unique.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop unique constraints on "user" table (except username)
    FOR r IN (
        SELECT conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
        AND rel.relname = 'user'
        AND con.contype = 'u'
        AND con.conname NOT LIKE '%username%' -- keep username unique
        AND con.conname NOT LIKE '%pkey%' -- keep primary key
    ) LOOP
        EXECUTE 'ALTER TABLE "user" DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- 2. Drop unique indexes on "user" table (except username and PKey)
    FOR r IN (
        SELECT i.relname AS indexname
        FROM pg_index x
        JOIN pg_class c ON c.oid = x.indrelid
        JOIN pg_class i ON i.oid = x.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'user'
        AND n.nspname = 'public'
        AND x.indisunique = true
        AND x.indisprimary = false -- explicitly skip primary key
        AND i.relname NOT LIKE '%username%'
    ) LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
    END LOOP;
END $$;
