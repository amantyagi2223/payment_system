ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

CREATE INDEX IF NOT EXISTS "Product_merchantId_quantity_idx"
  ON "Product"("merchantId", "quantity");
