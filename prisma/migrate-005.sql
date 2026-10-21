-- VideosKE update 005: videos publish straight away, content warnings, report categories, auto-hide.
-- Run AFTER migrate-004.sql. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "sensitive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'OTHER';
CREATE INDEX IF NOT EXISTS "Report_videoId_resolved_idx" ON "Report"("videoId", "resolved");

INSERT INTO "Setting" ("key", "value") VALUES
  ('auto_publish', 'true'),        -- new videos go live without review
  ('auto_hide_reports', '3'),      -- hide a video once it has this many open reports
  ('auto_approve_live', 'false')   -- live streams still need admin approval
ON CONFLICT ("key") DO NOTHING;

-- Publish videos that were waiting for review (not ones an admin rejected)
UPDATE "Video" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';
