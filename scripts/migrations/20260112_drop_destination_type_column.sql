-- Migration: Drop type column from destination table
-- Date: 2026-01-12

ALTER TABLE destination DROP COLUMN IF EXISTS type;
