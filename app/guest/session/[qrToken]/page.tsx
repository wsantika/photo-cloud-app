import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type GuestPhotoSessionPageProps = {
  params: Promise<{
    qrToken: string;
  }>;
};

function StatusBadge({
  status,
}: {
  status: "pending" | "active" | "completed" | "cancelled";
}) {
  const className =
    status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "active"
        ? "bg-blue-100 text-blue-700"
        : status === "cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700";

  const label =
    status === "completed"
      ? "Completed"
      : status === "active"
        ? "Active"
        : status === "cancelled"
          ? "Cancelled"
          : "Pending";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

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
    <main className="min-h-screen bg-black px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={photoSession.status} />
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  {photoSession.currentShotCount} / {photoSession.targetShots}{" "}
                  shots
                </span>
              </div>

              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                Photo Booth Gallery
              </h1>

              <p className="text-sm text-gray-300">
                Terima kasih sudah menggunakan photo booth. Di halaman ini kamu
                bisa preview dan download semua foto dari session kamu.
              </p>
            </div>

            {photoSession.photos.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={`/api/guest/session/${qrToken}/download`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black sm:w-auto"
                >
                  Download All Photos
                </a>
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Event
              </p>
              <p className="text-lg font-semibold text-white">
                {photoSession.event.title}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InfoCard
                label="Progress"
                value={`${photoSession.currentShotCount} / ${photoSession.targetShots}`}
              />
              <InfoCard label="Target Shots" value={photoSession.targetShots} />
              <InfoCard
                label="Current Count"
                value={photoSession.currentShotCount}
              />
              <InfoCard
                label="Total Photos"
                value={photoSession.photos.length}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Your Photos</h2>
              <p className="mt-1 text-sm text-gray-400">
                Semua foto di bawah ini hanya milik session kamu.
              </p>
            </div>
          </div>

          {photoSession.photos.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/15 px-6 text-center">
              <div>
                <p className="text-base font-medium text-white">
                  Belum ada foto dalam session ini
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Tunggu photographer mengambil foto, lalu refresh halaman ini
                  jika diperlukan.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {photoSession.photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-black/40"
                >
                  <div className="relative aspect-[4/5] bg-neutral-900">
                    <Image
                      src={photo.fileUrl}
                      alt={photo.fileName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        Photo {index + 1}
                      </p>
                      <p className="truncate text-sm font-medium text-white">
                        {photo.fileName}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={photo.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white"
                      >
                        Preview
                      </a>

                      <a
                        href={`/api/guest/photo/${photo.id}/download`}
                        className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
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
