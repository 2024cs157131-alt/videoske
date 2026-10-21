-- VideosKE update 002: tokens (Paystack), free/premium videos, live tickets,
-- creator earnings & payouts, ads.
-- Run AFTER setup.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

DO $$ BEGIN CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AdType" AS ENUM ('NATIVE', 'INTERSTITIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LedgerType" AS ENUM ('PURCHASE', 'SPEND', 'EARN', 'PAYOUT', 'PAYOUT_REFUND', 'ADMIN_CREDIT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New columns on existing tables
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "earnedTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "ticketPrice" INTEGER NOT NULL DEFAULT 0;

-- Old M-PESA SMS payment tables are no longer used
DROP TABLE IF EXISTS "Purchase" CASCADE;
DROP TABLE IF EXISTS "PaymentAttempt" CASCADE;
DROP TABLE IF EXISTS "MpesaTransaction" CASCADE;

CREATE TABLE IF NOT EXISTS "Unlock" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "tokens" INTEGER NOT NULL,
  "creatorShare" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Unlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Unlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Unlock_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Unlock_userId_videoId_key" ON "Unlock"("userId", "videoId");

CREATE TABLE IF NOT EXISTS "TokenPurchase" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokens" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "channel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "TokenPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TokenPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TokenPurchase_reference_key" ON "TokenPurchase"("reference");
CREATE INDEX IF NOT EXISTS "TokenPurchase_userId_createdAt_idx" ON "TokenPurchase"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "LedgerType" NOT NULL,
  "tokens" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokens" INTEGER NOT NULL,
  "amountKes" INTEGER NOT NULL,
  "phone" TEXT NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Payout_status_createdAt_idx" ON "Payout"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "Ad" (
  "id" TEXT NOT NULL,
  "type" "AdType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "imageUrl" TEXT,
  "linkUrl" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LiveTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "streamId" TEXT NOT NULL,
  "tokens" INTEGER NOT NULL,
  "creatorShare" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LiveTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LiveTicket_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "LiveStream"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LiveTicket_userId_streamId_key" ON "LiveTicket"("userId", "streamId");

-- Settings: remove old till settings, add token settings
DELETE FROM "Setting" WHERE "key" IN ('till_number', 'till_name', 'daraja_required', 'payment_max_age_hours');
INSERT INTO "Setting" ("key", "value") VALUES
  ('price_min', '150'),
  ('price_max', '200'),
  ('token_price_kes', '1'),
  ('token_price_usd', '0.01'),
  ('token_packages', '100,200,500,1000,2000'),
  ('usd_enabled', 'false'),
  ('commission_percent', '30'),
  ('payout_min_tokens', '1000'),
  ('native_ad_every', '8'),
  ('interstitial_minutes', '10')
ON CONFLICT ("key") DO NOTHING;

-- SECURITY: block Supabase's public REST API from the new tables
ALTER TABLE "Unlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenPurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveTicket" ENABLE ROW LEVEL SECURITY;
