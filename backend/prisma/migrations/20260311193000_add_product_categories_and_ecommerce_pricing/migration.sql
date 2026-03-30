ALTER TABLE "Product"
  ADD COLUMN "mrp" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  ADD COLUMN "salePrice" DECIMAL(18, 8) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryFee" DECIMAL(18, 8) NOT NULL DEFAULT 0;

CREATE TABLE "ProductCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_ProductToProductCategory" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

CREATE UNIQUE INDEX "_ProductToProductCategory_AB_unique"
  ON "_ProductToProductCategory"("A", "B");

CREATE INDEX "_ProductToProductCategory_B_index"
  ON "_ProductToProductCategory"("B");

ALTER TABLE "_ProductToProductCategory"
  ADD CONSTRAINT "_ProductToProductCategory_A_fkey"
  FOREIGN KEY ("A") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductToProductCategory"
  ADD CONSTRAINT "_ProductToProductCategory_B_fkey"
  FOREIGN KEY ("B") REFERENCES "ProductCategory"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
