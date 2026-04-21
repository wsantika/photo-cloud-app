import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const body = await req.json().catch(() => null);
    const targetShots = Number(body?.targetShots);

    if (!Number.isInteger(targetShots) || targetShots < 1) {
      return NextResponse.json(
        { message: "targetShots harus berupa angka lebih dari 0" },
        { status: 400 },
      );
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        createdById: session.user.id,
      },
    });

    if (!event) {
      return NextResponse.json(
        { message: "Event tidak ditemukan" },
        { status: 404 },
      );
    }

    const openSession = await prisma.photoSession.findFirst({
      where: {
        eventId: event.id,
        status: {
          in: ["pending", "active"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (openSession) {
      return NextResponse.json(
        {
          mode: "existing",
          message:
            "Masih ada photo session yang pending atau active. Kamu akan diarahkan ke session itu.",
          photoSession: openSession,
        },
        { status: 200 },
      );
    }

    const newPhotoSession = await prisma.photoSession.create({
      data: {
        eventId: event.id,
        createdById: session.user.id,
        qrToken: crypto.randomUUID(),
        targetShots,
        currentShotCount: 0,
        status: "pending",
      },
    });

    revalidatePath(`/dashboard/events/${event.id}`);
    revalidatePath(`/dashboard/events/${event.id}/photobooth`);

    return NextResponse.json(
      {
        mode: "created",
        message: "Photo session baru berhasil dibuat",
        photoSession: newPhotoSession,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE_NEXT_PHOTO_SESSION_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat photo session baru" },
      { status: 500 },
    );
  }
}
