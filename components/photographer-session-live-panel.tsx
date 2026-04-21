"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { PhotoSessionQr } from "@/components/photo-session-qr";

type LivePhoto = {
  id: string;
  fileName: string;
  fileUrl: string;
};

type LiveSession = {
  id: string;
  qrToken: string;
  targetShots: number;
  currentShotCount: number;
  status: "pending" | "active" | "completed" | "cancelled";
  photos: LivePhoto[];
};

type PhotographerSessionLivePanelProps = {
  eventId: string;
  appUrl: string;
  initialSession: LiveSession | null;
  selectedSessionId?: string | null;
};

function StatusBadge({ status }: { status: LiveSession["status"] }) {
  const className =
    status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "active"
        ? "bg-blue-100 text-blue-700"
        : status === "cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

export function PhotographerSessionLivePanel({
  eventId,
  appUrl,
  initialSession,
  selectedSessionId,
}: PhotographerSessionLivePanelProps) {
  const [currentSession, setCurrentSession] = useState<LiveSession | null>(
    initialSession,
  );
  const [isPolling, setIsPolling] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const fetchLatestPanel = useCallback(async () => {
    try {
      setIsPolling(true);

      const url = selectedSessionId
        ? `/api/events/${eventId}/photographer-panel?sessionId=${selectedSessionId}`
        : `/api/events/${eventId}/photographer-panel`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      setCurrentSession(result.currentSession ?? null);
    } catch (error) {
      console.error("PHOTOGRAPHER_PANEL_POLLING_ERROR", error);
    } finally {
      setIsPolling(false);
    }
  }, [eventId, selectedSessionId]);

  useEffect(() => {
    setCurrentSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    let isMounted = true;

    async function poll() {
      if (!isMounted) {
        return;
      }

      await fetchLatestPanel();
    }

    const interval = setInterval(poll, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchLatestPanel]);

  async function handleDeletePhoto(photoId: string) {
    const confirmed = window.confirm(
      "Yakin mau menghapus foto ini dari session?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingPhotoId(photoId);
      setActionMessage("");

      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.message || "Gagal menghapus foto");
        return;
      }

      setActionMessage("Foto berhasil dihapus");
      await fetchLatestPanel();
    } catch (error) {
      console.error("DELETE_PHOTO_CLIENT_ERROR", error);
      setActionMessage("Terjadi kesalahan saat menghapus foto");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  if (!currentSession) {
    return (
      <div className="rounded-3xl border p-6">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed">
          <div className="text-center">
            <p className="text-base font-medium">Belum ada session aktif</p>
            <p className="mt-2 text-sm text-gray-400">
              Refresh halaman atau buat session baru dari panel utama.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const guestUrl = `${appUrl}/guest/session/${currentSession.qrToken}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6 rounded-3xl border p-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Current Session</h2>
            <span className="text-xs text-gray-400">
              {isPolling ? "Updating..." : "Live"}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-400">
            Monitor QR, progress, dan status sesi aktif.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <PhotoSessionQr value={guestUrl} />
        </div>

        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium">Session ID:</span> {currentSession.id}
          </p>
          <p>
            <span className="font-medium">QR Token:</span>{" "}
            {currentSession.qrToken}
          </p>
          <p>
            <span className="font-medium">Progress:</span>{" "}
            {currentSession.currentShotCount} / {currentSession.targetShots}
          </p>
          <p>
            <span className="font-medium">Target Shots:</span>{" "}
            {currentSession.targetShots}
          </p>
          <p>
            <span className="font-medium">Current Shot Count:</span>{" "}
            {currentSession.currentShotCount}
          </p>

          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <StatusBadge status={currentSession.status} />
          </div>

          <p className="break-all text-xs text-gray-400">
            <span className="font-medium">Guest URL:</span> {guestUrl}
          </p>
        </div>

        {currentSession.status === "completed" ? (
          <div className="rounded-2xl border border-green-700/40 bg-green-900/20 p-4">
            <p className="text-sm text-green-200">
              Sesi ini sudah penuh. Jika perlu retake, kamu bisa hapus salah
              satu foto.
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Live Preview</h2>
            <p className="mt-1 text-sm text-gray-400">
              Preview hasil foto untuk session yang sedang dipakai.
            </p>
          </div>
        </div>

        {actionMessage ? (
          <div className="mb-4 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm">
            {actionMessage}
          </div>
        ) : null}

        {currentSession.photos.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed">
            <div className="text-center">
              <p className="text-base font-medium">
                Belum ada foto dalam sesi ini
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Setelah upload pertama berhasil, preview akan muncul di sini.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {currentSession.photos.map((photo) => (
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

                <div className="space-y-2 p-4">
                  <p className="truncate text-sm">{photo.fileName}</p>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={photo.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      Preview
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                      className="rounded-lg border border-red-500 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
                    >
                      {deletingPhotoId === photo.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
