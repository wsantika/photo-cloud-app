import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPhotoSession } from "./actions";
import { PhotoSessionQr } from "@/components/photo-session-qr";

type EventDetailPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { eventId } = await params;

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
      },
    },
  });

  if (!event) {
    notFound();
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Event Detail</h1>

          <Link
            href="/dashboard"
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-3 rounded-2xl border p-6 shadow">
          <h2 className="text-xl font-semibold">{event.title}</h2>
          <p className="text-sm text-gray-500">Slug: {event.slug}</p>

          {event.description ? (
            <p className="text-sm">{event.description}</p>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada deskripsi.</p>
          )}

          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {new Date(event.eventDate).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Location:</span>{" "}
              {event.location || "-"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Photo Sessions</h2>

            <form
              action={createPhotoSession}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="eventId" value={event.id} />

              <input
                type="number"
                name="targetShots"
                min={1}
                defaultValue={3}
                className="w-24 rounded-lg border px-3 py-2 text-sm"
                placeholder="Shots"
                required
              />

              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-2 text-sm text-white"
              >
                Create Photo Session
              </button>
            </form>
          </div>

          {event.photoSessions.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada photo session.</p>
          ) : (
            <div className="space-y-4">
              {event.photoSessions.map((photoSession) => {
                const guestUrl = `${appUrl}/guest/session/${photoSession.qrToken}`;

                return (
                  <div key={photoSession.id} className="rounded-xl border p-4">
                    <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-start">
                      <PhotoSessionQr value={guestUrl} />

                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Photo Session ID:</span>{" "}
                          {photoSession.id}
                        </p>
                        <p>
                          <span className="font-medium">QR Token:</span>{" "}
                          {photoSession.qrToken}
                        </p>
                        <p>
                          <span className="font-medium">Progress:</span>{" "}
                          {photoSession.currentShotCount} /{" "}
                          {photoSession.targetShots}
                        </p>
                        <p>
                          <span className="font-medium">Target Shots:</span>{" "}
                          {photoSession.targetShots}
                        </p>
                        <p>
                          <span className="font-medium">
                            Current Shot Count:
                          </span>{" "}
                          {photoSession.currentShotCount}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Status:</span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              photoSession.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : photoSession.status === "active"
                                  ? "bg-blue-100 text-blue-700"
                                  : photoSession.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {photoSession.status}
                          </span>
                        </div>
                        <p>
                          <span className="font-medium">Created At:</span>{" "}
                          {new Date(photoSession.createdAt).toLocaleString()}
                        </p>
                        <p className="break-all text-xs text-gray-500">
                          <span className="font-medium">Guest URL:</span>{" "}
                          {guestUrl}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
