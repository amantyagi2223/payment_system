-- Reconcile DB drift with current Prisma schema.
-- This migration is intentionally idempotent where possible.

-- 1) Ensure enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderItemStatus') THEN
    CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AddressType') THEN
    CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'OTHER');
  END IF;
END
$$;

-- 2) Keep CustomerWallet in sync with nullable relations/defaults
ALTER TABLE "CustomerWallet" ALTER COLUMN "isUsed" SET DEFAULT false;
ALTER TABLE "CustomerWallet" DROP CONSTRAINT IF EXISTS "CustomerWallet_customerId_fkey";
ALTER TABLE "CustomerWallet" DROP CONSTRAINT IF EXISTS "CustomerWallet_merchantId_fkey";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerWallet_customerId_fkey') THEN
    ALTER TABLE "CustomerWallet"
      ADD CONSTRAINT "CustomerWallet_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerWallet_merchantId_fkey') THEN
    ALTER TABLE "CustomerWallet"
      ADD CONSTRAINT "CustomerWallet_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- 3) Ensure supporting tables exist
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "priceAtPurchase" DECIMAL(18,8) NOT NULL,
  "subtotal" DECIMAL(18,8) NOT NULL,
  "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerAddress" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "street1" TEXT NOT NULL,
  "street2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT,
  "zipCode" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "addressType" "AddressType" NOT NULL DEFAULT 'HOME',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "_OldProductOrders" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_OldProductOrders_AB_pkey" PRIMARY KEY ("A","B")
);

-- 4) Ensure new order columns exist
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryAddressId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentAmount" DECIMAL(18,8);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentCurrency" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderValueUsdt" DECIMAL(18,8);

-- 5) Migrate legacy Order.productId/amount shape if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'productId'
  ) THEN
    INSERT INTO "_OldProductOrders" ("A", "B")
    SELECT o."id", o."productId"
    FROM "Order" o
    WHERE o."productId" IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO "OrderItem" (
      "id",
      "orderId",
      "productId",
      "quantity",
      "priceAtPurchase",
      "subtotal",
      "status",
      "createdAt",
      "updatedAt"
    )
    SELECT
      'legacy-' || o."id" || '-' || o."productId",
      o."id",
      o."productId",
      1,
      COALESCE(o."amount", 0),
      COALESCE(o."amount", 0),
      'PENDING'::"OrderItemStatus",
      COALESCE(o."createdAt", CURRENT_TIMESTAMP),
      COALESCE(o."updatedAt", CURRENT_TIMESTAMP)
    FROM "Order" o
    WHERE o."productId" IS NOT NULL
    ON CONFLICT DO NOTHING;

    ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_productId_fkey";
    ALTER TABLE "Order" DROP COLUMN IF EXISTS "productId";
  END IF;
END
$$;

-- 6) Move legacy amount -> totalAmount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'amount'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'totalAmount'
  ) THEN
    ALTER TABLE "Order" RENAME COLUMN "amount" TO "totalAmount";
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'totalAmount'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "totalAmount" DECIMAL(18,8) NOT NULL DEFAULT 0;
    ALTER TABLE "Order" ALTER COLUMN "totalAmount" DROP DEFAULT;
  END IF;
END
$$;

UPDATE "Order" SET "totalAmount" = 0 WHERE "totalAmount" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "totalAmount" TYPE DECIMAL(18,8) USING "totalAmount"::DECIMAL(18,8);
ALTER TABLE "Order" ALTER COLUMN "totalAmount" SET NOT NULL;
ALTER TABLE "Order" DROP COLUMN IF EXISTS "amount";

-- 7) Index/constraint fixes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ProductToProductCategory_AB_pkey') THEN
    ALTER TABLE "_ProductToProductCategory"
      ADD CONSTRAINT "_ProductToProductCategory_AB_pkey" PRIMARY KEY ("A", "B");
  END IF;
END
$$;
DROP INDEX IF EXISTS "_ProductToProductCategory_AB_unique";

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrderItem_orderId_productId_key" ON "OrderItem"("orderId", "productId");

CREATE INDEX IF NOT EXISTS "CustomerAddress_customerId_isDefault_idx" ON "CustomerAddress"("customerId", "isDefault");
CREATE INDEX IF NOT EXISTS "CustomerAddress_customerId_isActive_idx" ON "CustomerAddress"("customerId", "isActive");

DROP INDEX IF EXISTS "unique_default_address";
CREATE UNIQUE INDEX IF NOT EXISTS "unique_default_address"
  ON "CustomerAddress"("customerId", "name", "isDefault", "isActive");

CREATE INDEX IF NOT EXISTS "_OldProductOrders_B_index" ON "_OldProductOrders"("B");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_customerId_idempotencyKey_key" ON "Order"("customerId", "idempotencyKey");

-- 8) Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey') THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey') THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_deliveryAddressId_fkey') THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_deliveryAddressId_fkey"
      FOREIGN KEY ("deliveryAddressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerAddress_customerId_fkey') THEN
    ALTER TABLE "CustomerAddress"
      ADD CONSTRAINT "CustomerAddress_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_OldProductOrders_A_fkey') THEN
    ALTER TABLE "_OldProductOrders"
      ADD CONSTRAINT "_OldProductOrders_A_fkey"
      FOREIGN KEY ("A") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_OldProductOrders_B_fkey') THEN
    ALTER TABLE "_OldProductOrders"
      ADD CONSTRAINT "_OldProductOrders_B_fkey"
      FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
