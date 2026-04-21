"use client";

import { useEffect, useRef, useState } from "react";

type PhotographerCameraCaptureProps = {
  eventId: string;
  photoSessionId: string;
  disabled?: boolean;
  onUploadSuccess?: () => void | Promise<void>;
};

export function PhotographerCameraCapture({
  eventId,
  photoSessionId,
  disabled = false,
  onUploadSuccess,
}: PhotographerCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraStarted, setCameraStarted] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("");

  async function startCamera() {
    try {
      setStartingCamera(true);
      setMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStarted(true);
    } catch (error) {
      console.error("START_CAMERA_ERROR", error);
      setMessage("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
    } finally {
      setStartingCamera(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraStarted(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    try {
      setCapturing(true);
      setMessage("");

      const video = videoRef.current;
      const canvas = canvasRef.current;

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        setMessage("Preview kamera belum siap.");
        return;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        setMessage("Gagal mengambil frame kamera.");
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.95);
      });

      if (!blob) {
        setMessage("Gagal membuat file foto.");
        return;
      }

      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("eventId", eventId);
      formData.append("photoSessionId", photoSessionId);
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Upload hasil capture gagal.");
        return;
      }

      setMessage("Foto berhasil diambil dan diupload.");

      if (onUploadSuccess) {
        await onUploadSuccess();
      }
    } catch (error) {
      console.error("CAPTURE_PHOTO_ERROR", error);
      setMessage("Terjadi kesalahan saat capture foto.");
    } finally {
      setCapturing(false);
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  return (
    <div className="space-y-4 rounded-3xl border p-6">
      <div>
        <h2 className="text-xl font-bold">Camera Capture</h2>
        <p className="mt-1 text-sm text-gray-400">
          Gunakan webcam untuk preview dan capture langsung ke session ini.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border bg-neutral-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-video w-full object-cover"
        />

        {!cameraStarted ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Kamera belum aktif
          </div>
        ) : null}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-wrap gap-2">
        {!cameraStarted ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={startingCamera || disabled}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {startingCamera ? "Starting Camera..." : "Start Camera"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              disabled={capturing || disabled}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {capturing ? "Capturing..." : "Capture Photo"}
            </button>

            <button
              type="button"
              onClick={stopCamera}
              disabled={capturing}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {message ? (
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}
    </div>
  );
}
