-- CreateEnum
CREATE TYPE "PhotoSessionStatus" AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "photoSessionId" TEXT;

-- CreateTable
CREATE TABLE "PhotoSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "targetShots" INTEGER NOT NULL,
    "status" "PhotoSessionStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoSession_qrToken_key" ON "PhotoSession"("qrToken");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_photoSessionId_fkey" FOREIGN KEY ("photoSessionId") REFERENCES "PhotoSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSession" ADD CONSTRAINT "PhotoSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoSession" ADD CONSTRAINT "PhotoSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
