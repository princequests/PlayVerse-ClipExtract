CREATE TABLE "Content" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "year" TEXT,
  "duration" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "language" TEXT NOT NULL DEFAULT '',
  "country" TEXT NOT NULL DEFAULT '',
  "ageRating" TEXT NOT NULL DEFAULT '',
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContentSource" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "playbackMode" TEXT NOT NULL DEFAULT 'auto',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentSource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Genre" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");
CREATE INDEX "Content_status_category_idx" ON "Content"("status","category");
CREATE INDEX "Content_featured_sortOrder_idx" ON "Content"("featured","sortOrder");
CREATE INDEX "Content_title_idx" ON "Content"("title");
CREATE INDEX "Content_parentId_idx" ON "Content"("parentId");
CREATE INDEX "Content_kind_idx" ON "Content"("kind");
CREATE INDEX "ContentSource_contentId_idx" ON "ContentSource"("contentId");
ALTER TABLE "Content" ADD CONSTRAINT "Content_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
