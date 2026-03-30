-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");

-- Seed one super admin account
INSERT INTO "AdminAccount" ("id", "email", "password", "isActive", "createdAt")
VALUES (
    '6d188830-5cfa-4e66-b63a-a4f37f434f4d',
    'superadmin@stealth.local',
    '$2b$10$Ifvgb9.BKlIJgk.o7WXTS.WMIEsZDk/HU8M7kg8xjDRaOfCF0VjDe',
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;
