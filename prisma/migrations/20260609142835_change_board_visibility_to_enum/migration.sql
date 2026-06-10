/*
  Warnings:

  - The `visibility` column on the `Board` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BoardVisibility" AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Board" DROP COLUMN "visibility",
ADD COLUMN     "visibility" "BoardVisibility" NOT NULL DEFAULT 'WORKSPACE';
