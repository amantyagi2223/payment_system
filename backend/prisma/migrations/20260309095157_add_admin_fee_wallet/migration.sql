-- CreateTable
CREATE TABLE "AdminFeeWallet" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminFeeWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminFeeWallet_networkId_key" ON "AdminFeeWallet"("networkId");

-- CreateIndex
CREATE INDEX "AdminFeeWallet_isActive_idx" ON "AdminFeeWallet"("isActive");

-- AddForeignKey
ALTER TABLE "AdminFeeWallet" ADD CONSTRAINT "AdminFeeWallet_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "BlockchainNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
