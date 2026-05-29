import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedPreviewUrl } from "@/lib/supabase-signed-preview";

type RouteProps = {
  params: Promise<{
    eventId: string;
  }>;
};

async function attachPreviewUrlsToSession<
  T extends {
    id: string;
    qrToken: string;
    targetShots: number;
    currentShotCount: number;
    status: "pending" | "active" | "completed" | "cancelled";
    photos: Array<{
      id: string;
      fileName: string;
      filePath: string;
      thumbnailPath: string | null;
    }>;
  } | null,
>(photoSession: T) {
  if (!photoSession) {
    return null;
  }

  const photosWithPreviewUrl = await Promise.all(
    photoSession.photos.map(async (photo) => {
      const previewUrl = await getSignedPreviewUrl(
        photo.thumbnailPath ?? photo.filePath,
      );

      return {
        id: photo.id,
        fileName: photo.fileName,
        previewUrl,
      };
    }),
  );

  return {
    id: photoSession.id,
    qrToken: photoSession.qrToken,
    targetShots: photoSession.targetShots,
    currentShotCount: photoSession.currentShotCount,
    status: photoSession.status,
    photos: photosWithPreviewUrl,
  };
}

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
            select: {
              id: true,
              fileName: true,
              filePath: true,
              thumbnailPath: true,
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
            select: {
              id: true,
              fileName: true,
              filePath: true,
              thumbnailPath: true,
            },
          },
        },
      });
    }

    const currentSessionWithPreview =
      await attachPreviewUrlsToSession(currentSession);

    return NextResponse.json({
      eventId: event.id,
      eventTitle: event.title,
      currentSession: currentSessionWithPreview,
    });
  } catch (error) {
    console.error("PHOTOGRAPHER_PANEL_ROUTE_ERROR", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data panel fotografer" },
      { status: 500 },
    );
  }
}
