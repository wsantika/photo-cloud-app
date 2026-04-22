import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPhotoSession } from "../actions";
import { PhotographerSessionLivePanel } from "@/components/photographer-session-live-panel";

type PhotographerPanelPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams: Promise<{
    sessionId?: string;
  }>;
};

export default async function PhotographerPanelPage({
  params,
  searchParams,
}: PhotographerPanelPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { eventId } = await params;
  const { sessionId } = await searchParams;

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      createdById: session.user.id,
    },
    include: {
      photoSessions: {
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
      },
    },
  });

  if (!event) {
    notFound();
  }

  const selectedSession = sessionId
    ? (event.photoSessions.find(
        (photoSession) => photoSession.id === sessionId,
      ) ?? null)
    : null;

  const openSession =
    event.photoSessions.find(
      (photoSession) =>
        photoSession.status === "pending" || photoSession.status === "active",
    ) ?? null;

  const currentSession = selectedSession ?? openSession ?? null;

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const initialCurrentSession = currentSession
    ? {
        id: currentSession.id,
        qrToken: currentSession.qrToken,
        targetShots: currentSession.targetShots,
        currentShotCount: currentSession.currentShotCount,
        status: currentSession.status,
        photos: currentSession.photos.map((photo) => ({
          id: photo.id,
          fileName: photo.fileName,
          previewUrl: photo.fileUrl ?? null,
        })),
      }
    : null;

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Photographer Session Panel</h1>
            <p className="mt-1 text-sm text-gray-400">{event.title}</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Back to Event Detail
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {!currentSession ? (
          <div className="flex min-h-[70vh] items-center justify-center rounded-3xl border p-8">
            <div className="max-w-xl text-center">
              <h2 className="text-2xl font-bold">
                Ketuk tombol ini untuk memulai sesi foto
              </h2>
              <p className="mt-3 text-sm text-gray-400">
                Saat ini belum ada photo session yang pending atau active. Buat
                session baru untuk grup tamu berikutnya.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <form action={createPhotoSession}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="targetShots" value={3} />
                  <button
                    type="submit"
                    className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-black"
                  >
                    Create Session 3 Shots
                  </button>
                </form>

                <form action={createPhotoSession}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="targetShots" value={5} />
                  <button
                    type="submit"
                    className="rounded-lg border px-5 py-3 text-sm font-medium"
                  >
                    Create Session 5 Shots
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <PhotographerSessionLivePanel
            eventId={event.id}
            appUrl={appUrl}
            initialSession={initialCurrentSession}
            selectedSessionId={sessionId ?? null}
          />
        )}
      </div>
    </main>
  );
}
