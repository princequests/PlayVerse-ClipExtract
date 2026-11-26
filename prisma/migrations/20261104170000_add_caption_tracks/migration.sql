CREATE TABLE "CaptionTrack" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "label" TEXT NOT NULL DEFAULT 'English',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "format" TEXT NOT NULL DEFAULT 'vtt',
  "contentText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaptionTrack_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CaptionTrack_contentId_idx" ON "CaptionTrack"("contentId");
ALTER TABLE "CaptionTrack" ADD CONSTRAINT "CaptionTrack_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
