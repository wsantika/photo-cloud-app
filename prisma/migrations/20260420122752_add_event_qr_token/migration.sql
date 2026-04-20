/*
  Warnings:

  - A unique constraint covering the columns `[qrToken]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "qrToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Event_qrToken_key" ON "Event"("qrToken");
