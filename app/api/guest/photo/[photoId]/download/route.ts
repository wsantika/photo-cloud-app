import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type DownloadPhotoRouteProps = {
  params: Promise<{
    photoId: string;
  }>;
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]/g, "-");
}

export async function GET(req: Request, { params }: DownloadPhotoRouteProps) {
  try {
    const { photoId } = await params;
    const { searchParams } = new URL(req.url);
    const qrToken = searchParams.get("qrToken");

    if (!qrToken) {
      return NextResponse.json(
        { message: "qrToken wajib diisi" },
        { status: 400 },
      );
    }

    const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

    if (!bucketName) {
      return NextResponse.json(
        { message: "SUPABASE_STORAGE_BUCKET belum dikonfigurasi" },
        { status: 500 },
      );
    }

    const photo = await prisma.photo.findUnique({
      where: {
        id: photoId,
      },
      include: {
        photoSession: true,
      },
    });

    if (!photo || !photo.photoSession) {
      return NextResponse.json(
        { message: "Foto tidak ditemukan" },
        { status: 404 },
      );
    }

    if (photo.photoSession.qrToken !== qrToken) {
      return NextResponse.json(
        { message: "Foto ini tidak termasuk dalam session tersebut" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(photo.filePath);

    if (error || !data) {
      console.error("SUPABASE_DOWNLOAD_PHOTO_ERROR", error);

      return NextResponse.json(
        { message: "Gagal mengambil file foto dari storage" },
        { status: 500 },
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    const safeFileName = sanitizeFileName(photo.fileName || "photo.jpg");

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
      },
    });
  } catch (error) {
    console.error("DOWNLOAD_PHOTO_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat download foto" },
      { status: 500 },
    );
  }
}
