-- CreateEnum
CREATE TYPE "ImageProcessingStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Photo"
ADD COLUMN "thumbnailPath" TEXT,
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "imageProcessingStatus" "ImageProcessingStatus" NOT NULL DEFAULT 'queued',
ADD COLUMN "imageProcessingError" TEXT,
ADD COLUMN "imageProcessedAt" TIMESTAMP(3);
