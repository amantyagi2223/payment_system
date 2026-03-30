-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'FAILED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "payoutTxHash" TEXT,
ADD COLUMN "gasFundingTxHash" TEXT,
ADD COLUMN "payoutError" TEXT,
ADD COLUMN "payoutAddress" TEXT,
ADD COLUMN "payoutCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MerchantPayoutWallet" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantPayoutWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminGasWallet" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminGasWallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_merchantId_payoutStatus_idx" ON "Order"("merchantId", "payoutStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPayoutWallet_merchantId_networkId_key" ON "MerchantPayoutWallet"("merchantId", "networkId");

-- CreateIndex
CREATE INDEX "MerchantPayoutWallet_merchantId_isActive_idx" ON "MerchantPayoutWallet"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "MerchantPayoutWallet_networkId_isActive_idx" ON "MerchantPayoutWallet"("networkId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdminGasWallet_networkId_key" ON "AdminGasWallet"("networkId");

-- CreateIndex
CREATE INDEX "AdminGasWallet_isActive_idx" ON "AdminGasWallet"("isActive");

-- AddForeignKey
ALTER TABLE "MerchantPayoutWallet" ADD CONSTRAINT "MerchantPayoutWallet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayoutWallet" ADD CONSTRAINT "MerchantPayoutWallet_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "BlockchainNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminGasWallet" ADD CONSTRAINT "AdminGasWallet_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "BlockchainNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
