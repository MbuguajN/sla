-- CreateEnum
CREATE TYPE "BriefCategory" AS ENUM ('SAFE', 'SAT');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "briefCategory" "BriefCategory",
ADD COLUMN     "briefReceivedAt" TIMESTAMP(3);
