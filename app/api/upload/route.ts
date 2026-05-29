import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { enqueueImageProcessingJob } from "@/lib/image-processing-queue";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string | null;
    const photoSessionId = formData.get("photoSessionId") as string | null;

    if (!file || !eventId || !photoSessionId) {
      return NextResponse.json(
        { message: "File, eventId, dan photoSessionId wajib diisi" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { message: "Format file tidak didukung" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Ukuran file maksimal 10MB" },
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

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { message: "Event tidak ditemukan" },
        { status: 404 },
      );
    }

    const photoSession = await prisma.photoSession.findFirst({
      where: {
        id: photoSessionId,
        eventId: eventId,
      },
    });

    if (!photoSession) {
      return NextResponse.json(
        {
          message:
            "Photo session tidak ditemukan atau tidak cocok dengan event",
        },
        { status: 404 },
      );
    }

    if (photoSession.status === "completed") {
      return NextResponse.json(
        {
          message:
            "Photo session ini sudah selesai dan tidak bisa menerima upload lagi",
        },
        { status: 400 },
      );
    }

    if (photoSession.status === "cancelled") {
      return NextResponse.json(
        {
          message:
            "Photo session ini dibatalkan dan tidak bisa menerima upload",
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileExt = file.name.split(".").pop() || "jpg";
    const uniqueFileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `events/${eventId}/sessions/${photoSessionId}/${uniqueFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);

      return NextResponse.json(
        { message: uploadError.message || "Gagal upload file ke storage" },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const savedPhoto = await tx.photo.create({
        data: {
          eventId,
          photoSessionId,
          fileName: file.name,
          filePath,
          fileUrl: publicUrlData.publicUrl,
          mimeType: file.type,
          size: file.size,
        },
      });

      const totalPhotos = await tx.photo.count({
        where: {
          photoSessionId,
        },
      });

      const nextStatus =
        totalPhotos >= photoSession.targetShots ? "completed" : "active";

      const updatedPhotoSession = await tx.photoSession.update({
        where: {
          id: photoSessionId,
        },
        data: {
          currentShotCount: totalPhotos,
          status: nextStatus,
          startedAt: photoSession.startedAt ?? now,
          completedAt:
            nextStatus === "completed"
              ? (photoSession.completedAt ?? now)
              : null,
        },
      });

      return {
        savedPhoto,
        updatedPhotoSession,
        totalPhotos,
      };
    });

    enqueueImageProcessingJob();

    return NextResponse.json(
      {
        message: "Upload berhasil",
        data: result.savedPhoto,
        photoSession: result.updatedPhotoSession,
        currentShotCount: result.totalPhotos,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload photo error:", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat upload foto" },
      { status: 500 },
    );
  }
}
