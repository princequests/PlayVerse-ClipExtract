CREATE TABLE "ContentReaction" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentComment" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Guest',
    "voterKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentReaction_contentId_voterKey_key" ON "ContentReaction"("contentId", "voterKey");
CREATE INDEX "ContentReaction_contentId_value_idx" ON "ContentReaction"("contentId", "value");
CREATE INDEX "ContentComment_contentId_createdAt_idx" ON "ContentComment"("contentId", "createdAt");

ALTER TABLE "ContentReaction" ADD CONSTRAINT "ContentReaction_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentComment" ADD CONSTRAINT "ContentComment_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
