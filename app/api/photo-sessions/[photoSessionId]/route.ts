import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{
    photoSessionId: string;
  }>;
};

export async function DELETE(_req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { photoSessionId } = await params;

    const photoSession = await prisma.photoSession.findUnique({
      where: {
        id: photoSessionId,
      },
      include: {
        event: true,
        photos: {
          select: {
            id: true,
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

    if (photoSession.event.createdById !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const hasPhotos = photoSession.photos.length > 0;

    if (
      photoSession.status !== "pending" ||
      photoSession.currentShotCount > 0 ||
      hasPhotos
    ) {
      return NextResponse.json(
        {
          message:
            "Hanya session kosong dengan status pending yang boleh dihapus",
        },
        { status: 400 },
      );
    }

    await prisma.photoSession.delete({
      where: {
        id: photoSession.id,
      },
    });

    const nextOpenSession = await prisma.photoSession.findFirst({
      where: {
        eventId: photoSession.eventId,
        status: {
          in: ["pending", "active"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    revalidatePath(`/dashboard/events/${photoSession.eventId}`);
    revalidatePath(`/dashboard/events/${photoSession.eventId}/photobooth`);

    return NextResponse.json({
      message: "Photo session kosong berhasil dihapus",
      redirectSessionId: nextOpenSession?.id ?? null,
    });
  } catch (error) {
    console.error("DELETE_EMPTY_PHOTO_SESSION_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus photo session" },
      { status: 500 },
    );
  }
}
