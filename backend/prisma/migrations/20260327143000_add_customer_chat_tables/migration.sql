-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "CustomerChatSession" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerChatMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "role" "ChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "sources" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerChatSession_customerId_updatedAt_idx"
  ON "CustomerChatSession"("customerId", "updatedAt");

-- CreateIndex
CREATE INDEX "CustomerChatMessage_sessionId_createdAt_idx"
  ON "CustomerChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerChatSession"
  ADD CONSTRAINT "CustomerChatSession_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerChatMessage"
  ADD CONSTRAINT "CustomerChatMessage_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "CustomerChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
