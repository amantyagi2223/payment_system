-- CreateEnum
CREATE TYPE "SupportKnowledgeSourceType" AS ENUM ('FAQ', 'PAGE', 'POLICY', 'TROUBLESHOOTING');

-- CreateTable
CREATE TABLE "SupportKnowledgeEntry" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sourceType" "SupportKnowledgeSourceType" NOT NULL DEFAULT 'FAQ',
  "sourcePath" TEXT,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "embedding" JSONB,
  "embeddingModel" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SupportKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportKnowledgeEntry_slug_key" ON "SupportKnowledgeEntry"("slug");

-- CreateIndex
CREATE INDEX "SupportKnowledgeEntry_isActive_updatedAt_idx"
  ON "SupportKnowledgeEntry"("isActive", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportKnowledgeEntry_sourceType_isActive_idx"
  ON "SupportKnowledgeEntry"("sourceType", "isActive");
