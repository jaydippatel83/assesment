-- Replace the placeholder pricing model with the Inputs/Illustrations spreadsheet.
-- Illustrations saved under the old model cannot be regenerated with the new rules, and the old
-- plans have no values for the new limits, so both are cleared. Run `npm run db:seed` afterwards.
DELETE FROM "Illustration";
DELETE FROM "PolicyType";

-- AlterEnum
BEGIN;
CREATE TYPE "Frequency_new" AS ENUM ('ANNUAL', 'SEMI_ANNUAL', 'MONTHLY');
ALTER TABLE "PremiumOption" ALTER COLUMN "frequency" TYPE "Frequency_new" USING ("frequency"::text::"Frequency_new");
ALTER TABLE "Illustration" ALTER COLUMN "frequency" TYPE "Frequency_new" USING ("frequency"::text::"Frequency_new");
ALTER TYPE "Frequency" RENAME TO "Frequency_old";
ALTER TYPE "Frequency_new" RENAME TO "Frequency";
DROP TYPE "public"."Frequency_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Rider" DROP CONSTRAINT "Rider_policyTypeId_fkey";

-- AlterTable
ALTER TABLE "Illustration" DROP COLUMN "riderCodes",
ADD COLUMN     "irr" DECIMAL(9,6);

-- AlterTable
ALTER TABLE "PolicyType" DROP COLUMN "maxMaturityAge",
DROP COLUMN "maxSumAssured",
DROP COLUMN "minSumAssured",
ADD COLUMN     "maxPremium" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "maxPremiumTerm" INTEGER NOT NULL,
ADD COLUMN     "minPremium" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "sumAssuredCap" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "sumAssuredMultiple" DECIMAL(8,4) NOT NULL;

-- AlterTable
ALTER TABLE "PremiumOption" DROP COLUMN "modalFactor";

-- DropTable
DROP TABLE "Rider";

