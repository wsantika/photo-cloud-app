import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        createdById: session.user.id,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { message: "Event tidak ditemukan" },
        { status: 404 },
      );
    }

    let currentSession = null;

    if (sessionId) {
      currentSession = await prisma.photoSession.findFirst({
        where: {
          id: sessionId,
          eventId: event.id,
        },
        include: {
          photos: {
            orderBy: {
              uploadedAt: "asc",
            },
          },
        },
      });
    }

    if (!currentSession) {
      currentSession = await prisma.photoSession.findFirst({
        where: {
          eventId: event.id,
          status: {
            in: ["pending", "active"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          photos: {
            orderBy: {
              uploadedAt: "asc",
            },
          },
        },
      });
    }

    return NextResponse.json({
      eventId: event.id,
      eventTitle: event.title,
      currentSession,
    });
  } catch (error) {
    console.error("PHOTOGRAPHER_PANEL_ROUTE_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data panel fotografer" },
      { status: 500 },
    );
  }
}
