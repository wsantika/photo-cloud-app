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

    if (photoSession.status !== "cancelled") {
      return NextResponse.json(
        { message: "Hanya session cancelled yang bisa di-reopen" },
        { status: 400 },
      );
    }

    const otherOpenSession = await prisma.photoSession.findFirst({
      where: {
        eventId: photoSession.eventId,
        id: {
          not: photoSession.id,
        },
        status: {
          in: ["pending", "active"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (otherOpenSession) {
      return NextResponse.json({
        mode: "existing",
        message:
          "Masih ada photo session yang pending atau active. Kamu akan diarahkan ke session itu.",
        photoSession: otherOpenSession,
      });
    }

    let nextStatus: "pending" | "active" | "completed";

    if (photoSession.currentShotCount === 0) {
      nextStatus = "pending";
    } else if (photoSession.currentShotCount >= photoSession.targetShots) {
      nextStatus = "completed";
    } else {
      nextStatus = "active";
    }

    const reopenedPhotoSession = await prisma.photoSession.update({
      where: {
        id: photoSession.id,
      },
      data: {
        status: nextStatus,
        startedAt:
          nextStatus === "pending"
            ? null
            : (photoSession.startedAt ?? new Date()),
        completedAt: nextStatus === "completed" ? new Date() : null,
      },
    });

    revalidatePath(`/dashboard/events/${photoSession.eventId}`);
    revalidatePath(`/dashboard/events/${photoSession.eventId}/photobooth`);

    return NextResponse.json({
      mode: "reopened",
      message: "Photo session berhasil di-reopen",
      photoSession: reopenedPhotoSession,
    });
  } catch (error) {
    console.error("REOPEN_PHOTO_SESSION_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat reopen photo session" },
      { status: 500 },
    );
  }
}
