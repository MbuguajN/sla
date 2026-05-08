/*
  Warnings:

  - You are about to drop the column `homeAddress` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `homeLat` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `homeLng` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `homeSetAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "homeAddress",
DROP COLUMN "homeLat",
DROP COLUMN "homeLng",
DROP COLUMN "homeSetAt";
