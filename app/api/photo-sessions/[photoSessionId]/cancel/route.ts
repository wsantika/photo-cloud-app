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

export async function POST(_req: Request, { params }: RouteProps) {
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

    if (photoSession.status !== "pending" && photoSession.status !== "active") {
      return NextResponse.json(
        { message: "Hanya session pending atau active yang bisa di-cancel" },
        { status: 400 },
      );
    }

    const updatedPhotoSession = await prisma.photoSession.update({
      where: {
        id: photoSession.id,
      },
      data: {
        status: "cancelled",
        completedAt: null,
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
      message: "Photo session berhasil di-cancel",
      photoSession: updatedPhotoSession,
      redirectSessionId: nextOpenSession?.id ?? null,
    });
  } catch (error) {
    console.error("CANCEL_PHOTO_SESSION_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat cancel photo session" },
      { status: 500 },
    );
  }
}
