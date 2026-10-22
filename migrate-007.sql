-- Vidaake update 007: upload fingerprints (originality check) and weekly payout settings.
-- Not needed if your Vercel build runs `prisma db push` + seed (it applies these automatically).
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT;
CREATE INDEX IF NOT EXISTS "Video_fingerprint_idx" ON "Video"("fingerprint");
INSERT INTO "Setting" ("key", "value") VALUES ('payout_hold_days', '7'), ('payout_weekday', '5')
ON CONFLICT ("key") DO NOTHING;
UPDATE "Setting" SET "value" = '4500' WHERE "key" = 'payout_min_tokens' AND "value" = '1000';
