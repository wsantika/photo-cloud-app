import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

type RouteProps = {
  params: Promise<{
    photoId: string;
  }>;
};

export async function DELETE(_req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { photoId } = await params;

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
        event: true,
      },
    });

    if (!photo) {
      return NextResponse.json(
        { message: "Foto tidak ditemukan" },
        { status: 404 },
      );
    }

    if (photo.event.createdById !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!photo.photoSessionId) {
      return NextResponse.json(
        { message: "Foto ini tidak terhubung ke photo session" },
        { status: 400 },
      );
    }

    const photoSession = await prisma.photoSession.findUnique({
      where: {
        id: photo.photoSessionId,
      },
    });

    if (!photoSession) {
      return NextResponse.json(
        { message: "Photo session tidak ditemukan" },
        { status: 404 },
      );
    }

    const { error: removeError } = await supabase.storage
      .from(bucketName)
      .remove([photo.filePath]);

    if (removeError) {
      console.error("SUPABASE_REMOVE_ERROR", removeError);

      return NextResponse.json(
        { message: "Gagal menghapus file dari storage" },
        { status: 500 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.photo.delete({
        where: {
          id: photo.id,
        },
      });

      const remainingPhotos = await tx.photo.count({
        where: {
          photoSessionId: photo.photoSessionId!,
        },
      });

      let nextStatus: "pending" | "active" | "completed";

      if (remainingPhotos === 0) {
        nextStatus = "pending";
      } else if (remainingPhotos >= photoSession.targetShots) {
        nextStatus = "completed";
      } else {
        nextStatus = "active";
      }

      const updatedPhotoSession = await tx.photoSession.update({
        where: {
          id: photo.photoSessionId!,
        },
        data: {
          currentShotCount: remainingPhotos,
          status: nextStatus,
          startedAt: remainingPhotos === 0 ? null : photoSession.startedAt,
          completedAt:
            nextStatus === "completed" ? photoSession.completedAt : null,
        },
      });

      return {
        remainingPhotos,
        updatedPhotoSession,
      };
    });

    return NextResponse.json({
      message: "Foto berhasil dihapus",
      currentShotCount: result.remainingPhotos,
      photoSession: result.updatedPhotoSession,
    });
  } catch (error) {
    console.error("DELETE_PHOTO_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus foto" },
      { status: 500 },
    );
  }
}
