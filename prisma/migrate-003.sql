-- VideosKE update 003: video view counts, referrals, USD pricing for non-Kenyans.
-- Run AFTER migrate-002.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'REFERRAL';

ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralRewarded" BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey"
    FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "User_referredById_idx" ON "User"("referredById");

-- 1 token = KSh 1; USD prices are calculated from usd_rate (KES per 1 USD)
UPDATE "Setting" SET "value" = '1' WHERE "key" = 'token_price_kes';
DELETE FROM "Setting" WHERE "key" = 'token_price_usd';
INSERT INTO "Setting" ("key", "value") VALUES
  ('token_price_kes', '1'),
  ('usd_rate', '130'),
  ('referral_reward', '50'),
  ('referral_min_purchase', '100')
ON CONFLICT ("key") DO NOTHING;
