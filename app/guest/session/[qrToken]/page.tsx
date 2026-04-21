import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type GuestPhotoSessionPageProps = {
  params: Promise<{
    qrToken: string;
  }>;
};

export default async function GuestPhotoSessionPage({
  params,
}: GuestPhotoSessionPageProps) {
  const { qrToken } = await params;

  const photoSession = await prisma.photoSession.findUnique({
    where: {
      qrToken,
    },
    include: {
      event: true,
      photos: {
        orderBy: {
          uploadedAt: "asc",
        },
      },
    },
  });

  if (!photoSession) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border p-6 shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Photo Booth Gallery</h1>
              <p className="mt-2 text-sm text-gray-300">
                Terima kasih sudah menggunakan photo booth.
              </p>
            </div>

            {photoSession.photos.length > 0 ? (
              <a
                href={`/api/guest/session/${qrToken}/download`}
                className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Download All Photos
              </a>
            ) : null}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="font-medium">Event:</span>{" "}
              {photoSession.event.title}
            </p>

            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Session Status:</span>
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
              <span className="font-medium">Progress:</span>{" "}
              {photoSession.currentShotCount} / {photoSession.targetShots}
            </p>
            <p>
              <span className="font-medium">Target Shots:</span>{" "}
              {photoSession.targetShots}
            </p>
            <p>
              <span className="font-medium">Current Shot Count:</span>{" "}
              {photoSession.currentShotCount}
            </p>
            <p>
              <span className="font-medium">Total Photos:</span>{" "}
              {photoSession.photos.length}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Your Photos</h2>

          {photoSession.photos.length === 0 ? (
            <p className="text-sm text-gray-400">
              Belum ada foto dalam session ini.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photoSession.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border"
                >
                  <div className="relative aspect-square bg-neutral-900">
                    <Image
                      src={photo.fileUrl}
                      alt={photo.fileName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <p className="truncate text-sm">{photo.fileName}</p>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={photo.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block rounded-lg border px-4 py-2 text-sm"
                      >
                        Preview
                      </a>

                      <a
                        href={`/api/guest/photo/${photo.id}/download`}
                        className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
