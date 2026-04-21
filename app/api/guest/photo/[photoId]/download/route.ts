import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type DownloadPhotoRouteProps = {
  params: Promise<{
    photoId: string;
  }>;
};

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]/g, "-");
}

export async function GET(_req: Request, { params }: DownloadPhotoRouteProps) {
  try {
    const { photoId } = await params;

    const photo = await prisma.photo.findUnique({
      where: {
        id: photoId,
      },
    });

    if (!photo) {
      return NextResponse.json(
        { message: "Foto tidak ditemukan" },
        { status: 404 },
      );
    }

    const fileResponse = await fetch(photo.fileUrl);

    if (!fileResponse.ok) {
      return NextResponse.json(
        { message: "Gagal mengambil file foto" },
        { status: 500 },
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
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
