-- CreateEnum
CREATE TYPE "CollectionMemberRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterEnum
ALTER TYPE "TaskSource" ADD VALUE 'COLLECTION_BOARD';

-- CreateTable
CREATE TABLE "CollectionBoard" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBoardMember" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "CollectionMemberRole" NOT NULL DEFAULT 'MEMBER',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionBoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBoardColumn" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "BoardColumnKind" NOT NULL,
    "mappedTaskStatus" "TaskStatus" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionBoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBoardCard" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "columnId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "assignedById" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enteredColumnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionBoardCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBoardAccess" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionBoardAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionBoard_ownerId_idx" ON "CollectionBoard"("ownerId");

-- CreateIndex
CREATE INDEX "CollectionBoard_updatedAt_idx" ON "CollectionBoard"("updatedAt");

-- CreateIndex
CREATE INDEX "CollectionBoardMember_userId_idx" ON "CollectionBoardMember"("userId");

-- CreateIndex
CREATE INDEX "CollectionBoardMember_boardId_role_idx" ON "CollectionBoardMember"("boardId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionBoardMember_boardId_userId_key" ON "CollectionBoardMember"("boardId", "userId");

-- CreateIndex
CREATE INDEX "CollectionBoardColumn_boardId_position_idx" ON "CollectionBoardColumn"("boardId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionBoardColumn_boardId_code_key" ON "CollectionBoardColumn"("boardId", "code");

-- CreateIndex
CREATE INDEX "CollectionBoardCard_boardId_columnId_position_idx" ON "CollectionBoardCard"("boardId", "columnId", "position");

-- CreateIndex
CREATE INDEX "CollectionBoardCard_taskId_idx" ON "CollectionBoardCard"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionBoardCard_boardId_taskId_key" ON "CollectionBoardCard"("boardId", "taskId");

-- CreateIndex
CREATE INDEX "CollectionBoardAccess_userId_lastAccessedAt_idx" ON "CollectionBoardAccess"("userId", "lastAccessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionBoardAccess_boardId_userId_key" ON "CollectionBoardAccess"("boardId", "userId");

-- AddForeignKey
ALTER TABLE "CollectionBoard" ADD CONSTRAINT "CollectionBoard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardMember" ADD CONSTRAINT "CollectionBoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CollectionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardMember" ADD CONSTRAINT "CollectionBoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardColumn" ADD CONSTRAINT "CollectionBoardColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CollectionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardCard" ADD CONSTRAINT "CollectionBoardCard_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CollectionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardCard" ADD CONSTRAINT "CollectionBoardCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "CollectionBoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardCard" ADD CONSTRAINT "CollectionBoardCard_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardCard" ADD CONSTRAINT "CollectionBoardCard_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardAccess" ADD CONSTRAINT "CollectionBoardAccess_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "CollectionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionBoardAccess" ADD CONSTRAINT "CollectionBoardAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
