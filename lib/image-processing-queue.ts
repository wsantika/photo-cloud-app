import "server-only";

import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const THUMBNAIL_WIDTH = 1200;
const THUMBNAIL_HEIGHT = 1600;
const JPEG_QUALITY = 78;

let isWorkerRunning = false;

function getThumbnailPath(filePath: string) {
  const segments = filePath.split("/");
  const fileName = segments.pop() || `${crypto.randomUUID()}.jpg`;
  const baseName = fileName.replace(/\.[^.]+$/, "");

  return [...segments, "thumbnails", `${baseName}.jpg`].join("/");
}

async function processNextImageJob() {
  const photo = await prisma.photo.findFirst({
    where: {
      imageProcessingStatus: "queued",
    },
    orderBy: {
      uploadedAt: "asc",
    },
  });

  if (!photo) {
    return false;
  }

  const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

  if (!bucketName) {
    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        imageProcessingStatus: "failed",
        imageProcessingError: "SUPABASE_STORAGE_BUCKET belum dikonfigurasi",
      },
    });

    return true;
  }

  await prisma.photo.update({
    where: { id: photo.id },
    data: {
      imageProcessingStatus: "processing",
      imageProcessingError: null,
    },
  });

  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(photo.filePath);

    if (error || !data) {
      throw new Error(error?.message || "Gagal download original image");
    }

    const originalBuffer = Buffer.from(await data.arrayBuffer());
    const thumbnailBuffer = await sharp(originalBuffer)
      .rotate()
      .resize({
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
      })
      .toBuffer();

    const thumbnailPath = getThumbnailPath(photo.filePath);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Gagal upload thumbnail image");
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(thumbnailPath);

    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        thumbnailPath,
        thumbnailUrl: publicUrlData.publicUrl,
        imageProcessingStatus: "completed",
        imageProcessingError: null,
        imageProcessedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("IMAGE_PROCESSING_WORKER_ERROR", {
      photoId: photo.id,
      filePath: photo.filePath,
      error,
    });

    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        imageProcessingStatus: "failed",
        imageProcessingError:
          error instanceof Error ? error.message : "Image processing failed",
      },
    });
  }

  return true;
}

async function runImageProcessingWorker() {
  if (isWorkerRunning) {
    return;
  }

  isWorkerRunning = true;

  try {
    while (await processNextImageJob()) {
      // Keep draining queued images in order after each upload trigger.
    }
  } finally {
    isWorkerRunning = false;
  }
}

export function enqueueImageProcessingJob() {
  setImmediate(() => {
    void runImageProcessingWorker();
  });
}
