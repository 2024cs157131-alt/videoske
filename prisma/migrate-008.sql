-- Vidaake update 008: posts/stories, profile pictures, welcome bonus tokens.
-- Not needed if your Vercel build runs `prisma db push` + seed (it applies these automatically).
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'WELCOME_BONUS';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bonusTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarPath" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'VIDEO';
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "imagePath" TEXT;
ALTER TABLE "Video" ALTER COLUMN "videoPath" DROP NOT NULL;
INSERT INTO "Setting" ("key", "value") VALUES ('welcome_bonus', '200') ON CONFLICT ("key") DO NOTHING;
