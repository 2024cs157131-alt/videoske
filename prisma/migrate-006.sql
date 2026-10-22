-- VideosKE update 006: creator verification, saved payout details, earnings per 1000 unique views.
-- Not needed if your Vercel build runs `prisma db push` (it applies these changes automatically).
-- Otherwise run AFTER migrate-005.sql in Supabase → SQL Editor. Safe to run more than once.

ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'VIEWS';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'VERIFICATION';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutMethod" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutPhone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutBank" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutAccount" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutSwift" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "payoutCountry" TEXT;

ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "paidViews" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TokenPurchase" ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'TOKENS';
ALTER TABLE "TokenPurchase" ADD COLUMN IF NOT EXISTS "meta" JSONB;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'MPESA';

CREATE TABLE IF NOT EXISTS "VideoView" (
  "id" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoView_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VideoView_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VideoView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "VideoView_videoId_userId_key" ON "VideoView"("videoId", "userId");
ALTER TABLE "VideoView" ENABLE ROW LEVEL SECURITY;

INSERT INTO "Setting" ("key", "value") VALUES ('verification_fee_kes', '200'), ('views_rate', '20')
ON CONFLICT ("key") DO NOTHING;
