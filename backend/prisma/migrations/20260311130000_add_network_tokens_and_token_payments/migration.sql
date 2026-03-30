-- Add token catalog per network and wallet-token mappings for multi-asset support
CREATE TABLE "NetworkToken" (
  "id" TEXT NOT NULL,
  "networkId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL,
  "contractAddress" TEXT,
  "isNative" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NetworkToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MerchantPayoutWalletToken" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "receiveAddress" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantPayoutWalletToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentTransaction"
  ADD COLUMN "rawAmount" TEXT,
  ADD COLUMN "tokenId" TEXT,
  ADD COLUMN "tokenSymbol" TEXT,
  ADD COLUMN "tokenAddress" TEXT,
  ADD COLUMN "isTokenTransfer" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "NetworkToken_networkId_symbol_key"
  ON "NetworkToken"("networkId", "symbol");

CREATE INDEX "NetworkToken_networkId_isActive_idx"
  ON "NetworkToken"("networkId", "isActive");

CREATE UNIQUE INDEX "MerchantPayoutWalletToken_walletId_tokenId_key"
  ON "MerchantPayoutWalletToken"("walletId", "tokenId");

CREATE INDEX "MerchantPayoutWalletToken_walletId_isActive_idx"
  ON "MerchantPayoutWalletToken"("walletId", "isActive");

CREATE INDEX "MerchantPayoutWalletToken_tokenId_isActive_idx"
  ON "MerchantPayoutWalletToken"("tokenId", "isActive");

CREATE INDEX "PaymentTransaction_tokenId_idx"
  ON "PaymentTransaction"("tokenId");

ALTER TABLE "NetworkToken"
  ADD CONSTRAINT "NetworkToken_networkId_fkey"
  FOREIGN KEY ("networkId") REFERENCES "BlockchainNetwork"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MerchantPayoutWalletToken"
  ADD CONSTRAINT "MerchantPayoutWalletToken_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "MerchantPayoutWallet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MerchantPayoutWalletToken"
  ADD CONSTRAINT "MerchantPayoutWalletToken_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "NetworkToken"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentTransaction"
  ADD CONSTRAINT "PaymentTransaction_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "NetworkToken"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
