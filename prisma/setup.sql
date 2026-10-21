-- VideosKE database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.

DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "passwordHash" TEXT,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "dob" TIMESTAMP(3) NOT NULL,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "managedByAdmin" BOOLEAN NOT NULL DEFAULT false,
  "banned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Video" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "videoPath" TEXT NOT NULL,
  "thumbPath" TEXT,
  "previewPath" TEXT,
  "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Video_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Video_status_createdAt_idx" ON "Video"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Video_ownerId_idx" ON "Video"("ownerId");

CREATE TABLE IF NOT EXISTS "Purchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "mpesaCode" TEXT NOT NULL,
  "mpesaDate" TIMESTAMP(3) NOT NULL,
  "tillName" TEXT NOT NULL,
  "rawMessage" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Purchase_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_mpesaCode_key" ON "Purchase"("mpesaCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_userId_videoId_key" ON "Purchase"("userId", "videoId");

CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "rawMessage" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PaymentAttempt_userId_createdAt_idx" ON "PaymentAttempt"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "MpesaTransaction" (
  "id" TEXT NOT NULL,
  "transId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "shortCode" TEXT NOT NULL,
  "transTime" TIMESTAMP(3) NOT NULL,
  "msisdn" TEXT,
  "firstName" TEXT,
  "raw" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MpesaTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MpesaTransaction_transId_key" ON "MpesaTransaction"("transId");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Message_senderId_receiverId_createdAt_idx" ON "Message"("senderId", "receiverId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_receiverId_createdAt_idx" ON "Message"("receiverId", "createdAt");

CREATE TABLE IF NOT EXISTS "LiveStream" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "roomName" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "isLive" BOOLEAN NOT NULL DEFAULT true,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LiveStream_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LiveStream_roomName_key" ON "LiveStream"("roomName");
CREATE INDEX IF NOT EXISTS "LiveStream_isLive_idx" ON "LiveStream"("isLive");

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Comment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Comment_videoId_createdAt_idx" ON "Comment"("videoId", "createdAt");

CREATE TABLE IF NOT EXISTS "Report" (
  "id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "videoId" TEXT NOT NULL,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Report_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Setting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Default payment settings (change later in /admin)
INSERT INTO "Setting" ("key", "value") VALUES
  ('till_number', '123456'),
  ('till_name', 'VIDEOSKE'),
  ('price_min', '150'),
  ('price_max', '200'),
  ('daraja_required', 'false'),
  ('payment_max_age_hours', '24')
ON CONFLICT ("key") DO NOTHING;

-- SECURITY: block Supabase's public REST API from these tables.
-- The website talks to the database directly and is not affected.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MpesaTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveStream" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
