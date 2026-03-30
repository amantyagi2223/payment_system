-- Dev-only destructive migration to unify all wallets into CustomerWallet
-- This intentionally clears transactional data and recreates wallet storage.

TRUNCATE TABLE "WebhookEvent", "PaymentTransaction", "Order", "Invoice" CASCADE;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_walletId_fkey";

DROP TABLE IF EXISTS "CustomerWallet" CASCADE;
DROP TABLE IF EXISTS "Wallet" CASCADE;

CREATE TABLE "CustomerWallet" (
  "id" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "privateKey" TEXT,
  "merchantId" TEXT,
  "customerId" TEXT,
  "networkId" TEXT NOT NULL,
  "isUsed" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CustomerWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerWallet_networkId_address_key" ON "CustomerWallet"("networkId", "address");
CREATE INDEX "CustomerWallet_merchantId_networkId_idx" ON "CustomerWallet"("merchantId", "networkId");
CREATE INDEX "CustomerWallet_customerId_networkId_idx" ON "CustomerWallet"("customerId", "networkId");
CREATE INDEX "CustomerWallet_isUsed_idx" ON "CustomerWallet"("isUsed");
CREATE INDEX "CustomerWallet_networkId_idx" ON "CustomerWallet"("networkId");

-- Enforce one wallet per customer per chain for customer-owned wallets.
CREATE UNIQUE INDEX "CustomerWallet_customerId_networkId_unique_nonnull"
  ON "CustomerWallet"("customerId", "networkId")
  WHERE "customerId" IS NOT NULL;

ALTER TABLE "CustomerWallet"
  ADD CONSTRAINT "CustomerWallet_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerWallet"
  ADD CONSTRAINT "CustomerWallet_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerWallet"
  ADD CONSTRAINT "CustomerWallet_networkId_fkey"
  FOREIGN KEY ("networkId") REFERENCES "BlockchainNetwork"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "CustomerWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
