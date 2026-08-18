-- Add tour completion flag for the first-login Driver.js welcome tour.
-- IF NOT EXISTS keeps this idempotent for databases where the column was
-- applied manually before this migration existed.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tourCompletedAt" TIMESTAMP(3);
