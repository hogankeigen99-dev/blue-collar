-- CreateEnum
CREATE TYPE "ProjectHealth" AS ENUM ('ON_TRACK', 'AT_RISK');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "health" "ProjectHealth" NOT NULL DEFAULT 'ON_TRACK';
ALTER TABLE "Project" ADD COLUMN "healthNote" TEXT;
