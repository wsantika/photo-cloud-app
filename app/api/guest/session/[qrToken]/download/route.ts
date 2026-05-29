import JSZip from "jszip";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";

type DownloadSessionRouteProps = {
  params: Promise<{
    qrToken: string;
  }>;
};



export async function GET(
  _req: Request,
  { params }: DownloadSessionRouteProps,
) {
  try {
    const { qrToken } = await params;

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

    if (!bucketName) {
      return NextResponse.json(
        { message: "SUPABASE_STORAGE_BUCKET belum dikonfigurasi" },
        { status: 500 },
      );
    }

    const photoSession = await prisma.photoSession.findUnique({
      where: {
        qrToken,
      },
      include: {
        event: true,
        photos: {
          orderBy: {
            uploadedAt: "asc",
          },
        },
      },
    });

    if (!photoSession) {
      return NextResponse.json(
        { message: "Photo session tidak ditemukan" },
        { status: 404 },
      );
    }

    if (photoSession.photos.length === 0) {
      return NextResponse.json(
        { message: "Belum ada foto dalam session ini" },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    let addedFilesCount = 0;

    for (let index = 0; index < photoSession.photos.length; index++) {
      const photo = photoSession.photos[index];

      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(photo.filePath);

      if (error || !data) {
        console.error("SUPABASE_DOWNLOAD_ZIP_ITEM_ERROR", {
          photoId: photo.id,
          filePath: photo.filePath,
          error,
        });
        continue;
      }

      const arrayBuffer = await data.arrayBuffer();

      const originalFileName = photo.fileName || `photo-${index + 1}.jpg`;
      const safeFileName = sanitizeFileName(originalFileName);
      const numberedFileName = `${String(index + 1).padStart(2, "0")}-${safeFileName}`;

      zip.file(numberedFileName, arrayBuffer);
      addedFilesCount += 1;
    }

    if (addedFilesCount === 0) {
      return NextResponse.json(
        { message: "Gagal menyiapkan file ZIP untuk session ini" },
        { status: 500 },
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
    });

    const eventTitle = sanitizeFileName(photoSession.event.title);
    const zipFileName = `${eventTitle}-session-${photoSession.qrToken}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
      },
    });
  } catch (error) {
    console.error("DOWNLOAD_SESSION_ZIP_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat download foto session" },
      { status: 500 },
    );
  }
}
