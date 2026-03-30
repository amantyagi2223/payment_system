-- Add code column to BlockchainNetwork table (nullable initially for safety)
ALTER TABLE "BlockchainNetwork" ADD COLUMN "code" TEXT;

-- Update existing records with their correct codes based on chainId (with NULL check)
UPDATE "BlockchainNetwork" SET "code" = 'ETH' WHERE "chainId" = 1 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'POLYGON' WHERE "chainId" = 137 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'BINANCE' WHERE "chainId" = 56 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'BASE' WHERE "chainId" = 8453 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'OP' WHERE "chainId" = 10 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'TRON' WHERE "chainId" = 728126428 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'ETH_TESTNET' WHERE "chainId" = 11155111 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'POLYGON_TESTNET' WHERE "chainId" = 80002 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'BINANCE_TESTNET' WHERE "chainId" = 97 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'BASE_TESTNET' WHERE "chainId" = 84532 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'OP_TESTNET' WHERE "chainId" = 11155420 AND "code" IS NULL;
UPDATE "BlockchainNetwork" SET "code" = 'TRON_TESTNET' WHERE "chainId" = 3448148188 AND "code" IS NULL;

-- Add unique constraint
ALTER TABLE "BlockchainNetwork" ADD CONSTRAINT "BlockchainNetwork_code_key" UNIQUE ("code");

