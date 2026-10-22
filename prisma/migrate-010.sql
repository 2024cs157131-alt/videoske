-- Vidaake update 010: likes, reshares, comment moderation.
-- Not needed if your Vercel build runs `prisma db push` (it applies these automatically).
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "reportCount" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS "CommentReport" (
  "id" TEXT NOT NULL, "commentId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CommentReport_commentId_userId_key" ON "CommentReport"("commentId", "userId");
CREATE TABLE IF NOT EXISTS "Like" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "videoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Like_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Like_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_videoId_key" ON "Like"("userId", "videoId");
CREATE INDEX IF NOT EXISTS "Like_videoId_idx" ON "Like"("videoId");
CREATE TABLE IF NOT EXISTS "Reshare" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "videoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reshare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Reshare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reshare_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Reshare_userId_videoId_key" ON "Reshare"("userId", "videoId");
CREATE INDEX IF NOT EXISTS "Reshare_createdAt_idx" ON "Reshare"("createdAt");
ALTER TABLE "CommentReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reshare" ENABLE ROW LEVEL SECURITY;
