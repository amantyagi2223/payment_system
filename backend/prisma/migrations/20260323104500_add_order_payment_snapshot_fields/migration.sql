ALTER TABLE "Order"
  ADD COLUMN "paymentAmount" DECIMAL(18, 8),
  ADD COLUMN "paymentCurrency" TEXT,
  ADD COLUMN "orderValueUsdt" DECIMAL(18, 8);
