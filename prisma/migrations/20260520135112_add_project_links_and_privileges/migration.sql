-- CreateEnum
DO $$
BEGIN
    CREATE TYPE "Privilege" AS ENUM ('CAN_CREATE_CLIENTS', 'CAN_CREATE_PROJECTS', 'CAN_CREATE_TASKS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetupRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserPrivilege" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "privilege" "Privilege" NOT NULL,
    "grantedById" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPrivilege_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInviteToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLink" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPrivilege_userId_idx" ON "UserPrivilege"("userId");

-- CreateIndex
CREATE INDEX "UserPrivilege_grantedById_idx" ON "UserPrivilege"("grantedById");

-- CreateIndex
CREATE UNIQUE INDEX "UserPrivilege_userId_privilege_key" ON "UserPrivilege"("userId", "privilege");

-- CreateIndex
CREATE UNIQUE INDEX "UserInviteToken_userId_key" ON "UserInviteToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInviteToken_token_key" ON "UserInviteToken"("token");

-- CreateIndex
CREATE INDEX "UserInviteToken_email_idx" ON "UserInviteToken"("email");

-- CreateIndex
CREATE INDEX "UserInviteToken_expiresAt_idx" ON "UserInviteToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ProjectLink_projectId_idx" ON "ProjectLink"("projectId");

-- AddForeignKey
ALTER TABLE "UserPrivilege" ADD CONSTRAINT "UserPrivilege_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPrivilege" ADD CONSTRAINT "UserPrivilege_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInviteToken" ADD CONSTRAINT "UserInviteToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLink" ADD CONSTRAINT "ProjectLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
