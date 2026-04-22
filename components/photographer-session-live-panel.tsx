"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoSessionQr } from "@/components/photo-session-qr";
import { PhotographerCameraCapture } from "@/components/photographer-camera-capture";

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

function ProgressBadge({
  currentShotCount,
  targetShots,
}: {
  currentShotCount: number;
  targetShots: number;
}) {
  return (
    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
      {currentShotCount} / {targetShots} shots
    </span>
  );
}

export function PhotographerSessionLivePanel({
  eventId,
  appUrl,
  initialSession,
  selectedSessionId,
}: PhotographerSessionLivePanelProps) {
  const router = useRouter();

  const [currentSession, setCurrentSession] = useState<LiveSession | null>(
    initialSession,
  );
  const [isPolling, setIsPolling] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [creatingNextTargetShots, setCreatingNextTargetShots] = useState<
    number | null
  >(null);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [reopeningSession, setReopeningSession] = useState(false);
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

  async function handleCreateNextSession(targetShots: number) {
    try {
      setCreatingNextTargetShots(targetShots);
      setActionMessage("");

      const response = await fetch(`/api/events/${eventId}/photo-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetShots,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.message || "Gagal membuat photo session baru");
        return;
      }

      const targetSessionId = result.photoSession?.id;

      if (!targetSessionId) {
        setActionMessage("Session target tidak ditemukan.");
        return;
      }

      if (result.mode === "existing") {
        setActionMessage(
          "Masih ada session yang terbuka. Dialihkan ke session tersebut.",
        );
      }

      if (result.mode === "created") {
        setActionMessage("Session baru berhasil dibuat.");
      }

      router.push(
        `/dashboard/events/${eventId}/photobooth?sessionId=${targetSessionId}`,
      );
      router.refresh();
    } catch (error) {
      console.error("CREATE_NEXT_SESSION_CLIENT_ERROR", error);
      setActionMessage("Terjadi kesalahan saat membuat photo session baru");
    } finally {
      setCreatingNextTargetShots(null);
    }
  }

  async function handleCancelSession() {
    if (!currentSession) {
      return;
    }

    const confirmed = window.confirm(
      "Yakin mau cancel session ini? Session akan ditandai sebagai cancelled.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingSession(true);
      setActionMessage("");

      const response = await fetch(
        `/api/photo-sessions/${currentSession.id}/cancel`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.message || "Gagal cancel session");
        return;
      }

      setActionMessage("Session berhasil di-cancel");

      const redirectSessionId = result.redirectSessionId;

      if (redirectSessionId) {
        router.push(
          `/dashboard/events/${eventId}/photobooth?sessionId=${redirectSessionId}`,
        );
      } else {
        router.push(`/dashboard/events/${eventId}/photobooth`);
      }

      router.refresh();
    } catch (error) {
      console.error("CANCEL_SESSION_CLIENT_ERROR", error);
      setActionMessage("Terjadi kesalahan saat cancel session");
    } finally {
      setCancellingSession(false);
    }
  }

  async function handleDeleteEmptySession() {
    if (!currentSession) {
      return;
    }

    const confirmed = window.confirm("Yakin mau menghapus session kosong ini?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSession(true);
      setActionMessage("");

      const response = await fetch(`/api/photo-sessions/${currentSession.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.message || "Gagal menghapus session kosong");
        return;
      }

      setActionMessage("Session kosong berhasil dihapus");

      const redirectSessionId = result.redirectSessionId;

      if (redirectSessionId) {
        router.push(
          `/dashboard/events/${eventId}/photobooth?sessionId=${redirectSessionId}`,
        );
      } else {
        router.push(`/dashboard/events/${eventId}/photobooth`);
      }

      router.refresh();
    } catch (error) {
      console.error("DELETE_EMPTY_SESSION_CLIENT_ERROR", error);
      setActionMessage("Terjadi kesalahan saat menghapus session kosong");
    } finally {
      setDeletingSession(false);
    }
  }

  async function handleReopenSession() {
    if (!currentSession) {
      return;
    }

    try {
      setReopeningSession(true);
      setActionMessage("");

      const response = await fetch(
        `/api/photo-sessions/${currentSession.id}/reopen`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.message || "Gagal reopen session");
        return;
      }

      const targetSessionId = result.photoSession?.id;

      if (!targetSessionId) {
        setActionMessage("Session target tidak ditemukan.");
        return;
      }

      if (result.mode === "existing") {
        setActionMessage(
          "Masih ada session yang terbuka. Dialihkan ke session tersebut.",
        );
      }

      if (result.mode === "reopened") {
        setActionMessage("Session berhasil di-reopen.");
      }

      router.push(
        `/dashboard/events/${eventId}/photobooth?sessionId=${targetSessionId}`,
      );
      router.refresh();
    } catch (error) {
      console.error("REOPEN_SESSION_CLIENT_ERROR", error);
      setActionMessage("Terjadi kesalahan saat reopen session");
    } finally {
      setReopeningSession(false);
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
  const canCapture =
    currentSession.status === "pending" || currentSession.status === "active";

  const canDeleteEmptySession =
    currentSession.status === "pending" &&
    currentSession.currentShotCount === 0 &&
    currentSession.photos.length === 0;

  const canCancelSession =
    (currentSession.status === "pending" ||
      currentSession.status === "active") &&
    !canDeleteEmptySession;

  const canReopenSession = currentSession.status === "cancelled";

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6 rounded-3xl border p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Current Session</h2>
              <p className="mt-1 text-sm text-gray-400">
                Monitor QR, progress, dan status sesi aktif.
              </p>
            </div>

            <span className="text-xs text-green-400">Live</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={currentSession.status} />
            <ProgressBadge
              currentShotCount={currentSession.currentShotCount}
              targetShots={currentSession.targetShots}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <PhotoSessionQr value={guestUrl} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="grid gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Session ID
              </p>
              <p className="break-all font-medium">{currentSession.id}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                QR Token
              </p>
              <p className="break-all font-medium">{currentSession.qrToken}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Target
                </p>
                <p className="mt-1 text-lg font-bold">
                  {currentSession.targetShots}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Current
                </p>
                <p className="mt-1 text-lg font-bold">
                  {currentSession.currentShotCount}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Guest URL
              </p>
              <p className="break-all text-xs text-gray-300">{guestUrl}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div>
            <h3 className="text-sm font-semibold">Session Actions</h3>
            <p className="mt-1 text-xs text-gray-400">
              Kelola session yang sedang dibuka.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {canDeleteEmptySession ? (
              <button
                type="button"
                onClick={handleDeleteEmptySession}
                disabled={deletingSession}
                className="w-full rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-300 disabled:opacity-50"
              >
                {deletingSession
                  ? "Deleting Session..."
                  : "Delete Empty Session"}
              </button>
            ) : null}

            {canCancelSession ? (
              <button
                type="button"
                onClick={handleCancelSession}
                disabled={cancellingSession}
                className="w-full rounded-lg border border-yellow-500 px-4 py-2 text-sm font-medium text-yellow-300 disabled:opacity-50"
              >
                {cancellingSession ? "Cancelling Session..." : "Cancel Session"}
              </button>
            ) : null}

            {canReopenSession ? (
              <button
                type="button"
                onClick={handleReopenSession}
                disabled={reopeningSession}
                className="w-full rounded-lg border border-blue-500 px-4 py-2 text-sm font-medium text-blue-300 disabled:opacity-50"
              >
                {reopeningSession ? "Reopening Session..." : "Reopen Session"}
              </button>
            ) : null}

            {!canDeleteEmptySession &&
            !canCancelSession &&
            !canReopenSession ? (
              <div className="rounded-lg border border-white/10 px-4 py-3 text-sm text-gray-400">
                Tidak ada action khusus untuk session ini.
              </div>
            ) : null}
          </div>
        </div>

        {currentSession.status === "completed" ? (
          <div className="space-y-3 rounded-2xl border border-green-700/40 bg-green-900/20 p-4">
            <div>
              <h3 className="text-sm font-semibold text-green-200">
                Next Session
              </h3>
              <p className="mt-1 text-xs text-green-300/80">
                Session ini sudah penuh. Buat session baru untuk tamu
                berikutnya.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCreateNextSession(3)}
                disabled={creatingNextTargetShots !== null}
                className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {creatingNextTargetShots === 3
                  ? "Creating 3 Shots..."
                  : "Create Next Session 3 Shots"}
              </button>

              <button
                type="button"
                onClick={() => handleCreateNextSession(5)}
                disabled={creatingNextTargetShots !== null}
                className="w-full rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {creatingNextTargetShots === 5
                  ? "Creating 5 Shots..."
                  : "Create Next Session 5 Shots"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <PhotographerCameraCapture
          eventId={eventId}
          photoSessionId={currentSession.id}
          disabled={!canCapture}
          onUploadSuccess={fetchLatestPanel}
        />

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
                        {deletingPhotoId === photo.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
