-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('STANDARD', 'SELF_BOARD');

-- CreateEnum
CREATE TYPE "BoardColumnKind" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CUSTOM');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "source" "TaskSource" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "PersonalBoardColumn" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "BoardColumnKind" NOT NULL,
    "mappedTaskStatus" "TaskStatus" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalBoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalBoardCard" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "assignedById" INTEGER,
    "columnId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalBoardCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalBoardColumn_userId_code_key" ON "PersonalBoardColumn"("userId", "code");

-- CreateIndex
CREATE INDEX "PersonalBoardColumn_userId_position_idx" ON "PersonalBoardColumn"("userId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalBoardCard_taskId_key" ON "PersonalBoardCard"("taskId");

-- CreateIndex
CREATE INDEX "PersonalBoardCard_ownerId_columnId_position_idx" ON "PersonalBoardCard"("ownerId", "columnId", "position");

-- AddForeignKey
ALTER TABLE "PersonalBoardColumn" ADD CONSTRAINT "PersonalBoardColumn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBoardCard" ADD CONSTRAINT "PersonalBoardCard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBoardCard" ADD CONSTRAINT "PersonalBoardCard_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBoardCard" ADD CONSTRAINT "PersonalBoardCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "PersonalBoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBoardCard" ADD CONSTRAINT "PersonalBoardCard_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBoardCard" ADD CONSTRAINT "PersonalBoardCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBoardCard" ADD CONSTRAINT "PersonalBoardCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
