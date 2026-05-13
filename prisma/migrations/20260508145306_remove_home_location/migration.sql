/*
  Warnings:

  - You are about to drop the column `homeAddress` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `homeLat` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `homeLng` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `homeSetAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User"
DROP COLUMN IF EXISTS "homeAddress",
DROP COLUMN IF EXISTS "homeLat",
DROP COLUMN IF EXISTS "homeLng",
DROP COLUMN IF EXISTS "homeSetAt";
