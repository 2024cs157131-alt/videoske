-- VideosKE update 004: admin approval for live streams, sexual-content flags, live heartbeat.
-- Run AFTER migrate-003.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "flaggedSexual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "moderationNote" TEXT;

-- Existing streams count as approved; new streams start as PENDING
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "status" "VideoStatus" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "LiveStream" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "flaggedSexual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- End any streams left running from before this update
UPDATE "LiveStream" SET "isLive" = false, "endedAt" = CURRENT_TIMESTAMP WHERE "isLive" = true;
