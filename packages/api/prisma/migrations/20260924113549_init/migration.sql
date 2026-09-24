-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "emailEnc" BYTEA NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nameEnc" BYTEA NOT NULL,
    "dobEnc" BYTEA NOT NULL,
    "mobileEnc" BYTEA NOT NULL,
    "nameInitial" VARCHAR(1) NOT NULL,
    "mobileLast4" VARCHAR(4) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL,
    "maxAge" INTEGER NOT NULL,
    "minTerm" INTEGER NOT NULL,
    "maxTerm" INTEGER NOT NULL,
    "minPremiumTerm" INTEGER NOT NULL,
    "maxMaturityAge" INTEGER NOT NULL,
    "minSumAssured" DECIMAL(15,2) NOT NULL,
    "maxSumAssured" DECIMAL(15,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "policyTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ratePerMille" DECIMAL(10,4) NOT NULL,
    "coverPct" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumOption" (
    "id" TEXT NOT NULL,
    "policyTypeId" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "modalFactor" DECIMAL(8,6) NOT NULL,
    "instalmentsPerYear" INTEGER NOT NULL,

    CONSTRAINT "PremiumOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateTable" (
    "id" TEXT NOT NULL,
    "policyTypeId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "assumptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Illustration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyTypeId" TEXT NOT NULL,
    "dobEnc" BYTEA NOT NULL,
    "gender" "Gender" NOT NULL,
    "sumAssured" DECIMAL(15,2) NOT NULL,
    "policyTerm" INTEGER NOT NULL,
    "premiumTerm" INTEGER NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "riderCodes" TEXT[],
    "asOfDate" DATE NOT NULL,
    "rateVersion" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "modalPremium" DECIMAL(15,2) NOT NULL,
    "totalPremium" DECIMAL(15,2) NOT NULL,
    "maturityBenefit" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Illustration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ipHash" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailHash_key" ON "User"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyType_code_key" ON "PolicyType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_policyTypeId_code_key" ON "Rider"("policyTypeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumOption_policyTypeId_frequency_key" ON "PremiumOption"("policyTypeId", "frequency");

-- CreateIndex
CREATE UNIQUE INDEX "RateTable_policyTypeId_version_key" ON "RateTable"("policyTypeId", "version");

-- CreateIndex
CREATE INDEX "Illustration_userId_createdAt_idx" ON "Illustration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_policyTypeId_fkey" FOREIGN KEY ("policyTypeId") REFERENCES "PolicyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumOption" ADD CONSTRAINT "PremiumOption_policyTypeId_fkey" FOREIGN KEY ("policyTypeId") REFERENCES "PolicyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateTable" ADD CONSTRAINT "RateTable_policyTypeId_fkey" FOREIGN KEY ("policyTypeId") REFERENCES "PolicyType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Illustration" ADD CONSTRAINT "Illustration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Illustration" ADD CONSTRAINT "Illustration_policyTypeId_fkey" FOREIGN KEY ("policyTypeId") REFERENCES "PolicyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
