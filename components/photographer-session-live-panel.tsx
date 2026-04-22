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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm sm:p-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
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
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [creatingNextTargetShots, setCreatingNextTargetShots] = useState<
    number | null
  >(null);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);
  const [reopeningSession, setReopeningSession] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  const fetchLatestPanel = useCallback(async () => {
    try {
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
      setLastSyncedAt(Date.now());
    } catch (error) {
      console.error("PHOTOGRAPHER_PANEL_POLLING_ERROR", error);
    }
  }, [eventId, selectedSessionId]);

  useEffect(() => {
    setCurrentSession(initialSession);
    setLastSyncedAt(Date.now());
  }, [initialSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchLatestPanel();
    }, 2500);

    return () => clearInterval(interval);
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
      } else {
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
      } else {
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
      <SectionCard
        title="No Active Session"
        description="Belum ada session aktif untuk event ini."
      >
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center">
          <div>
            <p className="text-base font-medium">Belum ada session aktif</p>
            <p className="mt-2 text-sm text-gray-400">
              Buat session baru dari panel utama untuk mulai mengambil foto.
            </p>
          </div>
        </div>
      </SectionCard>
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
    <div className="grid gap-5 md:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
      <div className="space-y-5">
        <SectionCard
          title="Current Session"
          description="Monitor QR, progress, dan status sesi aktif."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentSession.status} />
              <ProgressBadge
                currentShotCount={currentSession.currentShotCount}
                targetShots={currentSession.targetShots}
              />
              <span className="text-[11px] text-gray-500">
                last sync {new Date(lastSyncedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="mx-auto max-w-[220px] rounded-2xl bg-white p-3">
              <PhotoSessionQr value={guestUrl} />
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  Session ID
                </p>
                <p className="mt-1 break-all text-sm font-medium">
                  {currentSession.id}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  QR Token
                </p>
                <p className="mt-1 break-all text-sm font-medium">
                  {currentSession.qrToken}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">
                  Guest URL
                </p>
                <p className="mt-1 break-all text-xs text-gray-300">
                  {guestUrl}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    Target
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {currentSession.targetShots}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    Current
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {currentSession.currentShotCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Session Actions"
          description="Kelola session yang sedang dibuka."
        >
          <div className="space-y-2">
            {canDeleteEmptySession ? (
              <button
                type="button"
                onClick={handleDeleteEmptySession}
                disabled={deletingSession}
                className="w-full rounded-xl border border-red-500 px-4 py-3 text-sm font-medium text-red-300 disabled:opacity-50"
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
                className="w-full rounded-xl border border-yellow-500 px-4 py-3 text-sm font-medium text-yellow-300 disabled:opacity-50"
              >
                {cancellingSession ? "Cancelling Session..." : "Cancel Session"}
              </button>
            ) : null}

            {canReopenSession ? (
              <button
                type="button"
                onClick={handleReopenSession}
                disabled={reopeningSession}
                className="w-full rounded-xl border border-blue-500 px-4 py-3 text-sm font-medium text-blue-300 disabled:opacity-50"
              >
                {reopeningSession ? "Reopening Session..." : "Reopen Session"}
              </button>
            ) : null}

            {!canDeleteEmptySession &&
            !canCancelSession &&
            !canReopenSession ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
                Tidak ada action khusus untuk session ini.
              </div>
            ) : null}
          </div>
        </SectionCard>

        {currentSession.status === "completed" ? (
          <SectionCard
            title="Next Session"
            description="Session ini sudah penuh. Buat session baru untuk tamu berikutnya."
          >
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCreateNextSession(3)}
                disabled={creatingNextTargetShots !== null}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                {creatingNextTargetShots === 3
                  ? "Creating 3 Shots..."
                  : "Create Next Session 3 Shots"}
              </button>

              <button
                type="button"
                onClick={() => handleCreateNextSession(5)}
                disabled={creatingNextTargetShots !== null}
                className="w-full rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {creatingNextTargetShots === 5
                  ? "Creating 5 Shots..."
                  : "Create Next Session 5 Shots"}
              </button>
            </div>
          </SectionCard>
        ) : null}
      </div>

      <div className="space-y-5">
        <PhotographerCameraCapture
          eventId={eventId}
          photoSessionId={currentSession.id}
          disabled={!canCapture}
          onUploadSuccess={fetchLatestPanel}
        />

        <SectionCard
          title="Live Preview"
          description="Preview hasil foto untuk session yang sedang dipakai."
        >
          {actionMessage ? (
            <div className="mb-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
              {actionMessage}
            </div>
          ) : null}

          {currentSession.photos.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center">
              <div>
                <p className="text-base font-medium">
                  Belum ada foto dalam sesi ini
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Setelah upload pertama berhasil, preview akan muncul di sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {currentSession.photos.map((photo) => (
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
                    <p className="truncate text-sm font-medium">
                      {photo.fileName}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={photo.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm font-medium"
                      >
                        Preview
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        disabled={deletingPhotoId === photo.id}
                        className="rounded-xl border border-red-500 px-4 py-3 text-sm font-medium text-red-300 disabled:opacity-50"
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
        </SectionCard>
      </div>
    </div>
  );
}
