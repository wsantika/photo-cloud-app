"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PhotographerCameraCaptureProps = {
  eventId: string;
  photoSessionId: string;
  disabled?: boolean;
  onUploadSuccess?: () => void | Promise<void>;
};

type CameraDevice = {
  deviceId: string;
  label: string;
};

const SHOULD_UNMIRROR_CAMERA = true;

export function PhotographerCameraCapture({
  eventId,
  photoSessionId,
  disabled = false,
  onUploadSuccess,
}: PhotographerCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("");

  const loadCameraDevices = useCallback(async () => {
    try {
      setLoadingDevices(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setMessage("Browser ini tidak mendukung akses daftar kamera.");
        return;
      }

      const mediaDevices = await navigator.mediaDevices.enumerateDevices();

      const videoInputs = mediaDevices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      setDevices(videoInputs);

      setSelectedDeviceId((prev) => {
        if (!prev && videoInputs.length > 0) {
          return videoInputs[0].deviceId;
        }
        if (
          prev &&
          videoInputs.length > 0 &&
          !videoInputs.some((device) => device.deviceId === prev)
        ) {
          return videoInputs[0].deviceId;
        }
        return prev;
      });
    } catch (error) {
      console.error("LOAD_CAMERA_DEVICES_ERROR", error);
      setMessage("Gagal mengambil daftar kamera.");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  async function attachStreamToVideo(stream: MediaStream) {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }

  async function startCamera() {
    try {
      setStartingCamera(true);
      setMessage("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessage("Browser ini tidak mendukung akses kamera.");
        return;
      }

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedDeviceId
          ? {
              deviceId: {
                exact: selectedDeviceId,
              },
            }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      await attachStreamToVideo(stream);
      setCameraStarted(true);

      await loadCameraDevices();
    } catch (error) {
      console.error("START_CAMERA_ERROR", error);
      setMessage("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
      setCameraStarted(false);
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

  async function restartCameraWithSelectedDevice(nextDeviceId: string) {
    try {
      setMessage("");
      setStartingCamera(true);

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: nextDeviceId
          ? {
              deviceId: {
                exact: nextDeviceId,
              },
            }
          : true,
      });

      streamRef.current = stream;
      await attachStreamToVideo(stream);
      setCameraStarted(true);
    } catch (error) {
      console.error("RESTART_CAMERA_ERROR", error);
      setMessage("Gagal mengganti kamera.");
      setCameraStarted(false);
    } finally {
      setStartingCamera(false);
    }
  }

  async function handleDeviceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextDeviceId = e.target.value;
    setSelectedDeviceId(nextDeviceId);

    if (cameraStarted) {
      await restartCameraWithSelectedDevice(nextDeviceId);
    }
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

      context.clearRect(0, 0, width, height);

      if (SHOULD_UNMIRROR_CAMERA) {
        context.save();
        context.translate(width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, width, height);
        context.restore();
      } else {
        context.drawImage(video, 0, 0, width, height);
      }

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
    const init = async () => {
      await loadCameraDevices();
    };
    
    void init();

    function handleDeviceChangeEvent() {
      void init();
    }

    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      handleDeviceChangeEvent,
    );

    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        handleDeviceChangeEvent,
      );

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, [loadCameraDevices]);

  return (
    <div className="space-y-4 rounded-3xl border p-6">
      <div>
        <h2 className="text-xl font-bold">Camera Capture</h2>
        <p className="mt-1 text-sm text-gray-400">
          Gunakan webcam untuk preview dan capture langsung ke session ini.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
              Camera Device
            </label>
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              disabled={loadingDevices || startingCamera || disabled}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {devices.length === 0 ? (
                <option value="">No camera detected</option>
              ) : (
                devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={loadCameraDevices}
            disabled={loadingDevices || startingCamera}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            {loadingDevices ? "Refreshing..." : "Refresh Devices"}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Nama kamera biasanya baru muncul lengkap setelah izin kamera
          diberikan.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border bg-neutral-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-video w-full object-cover"
          style={{
            transform: SHOULD_UNMIRROR_CAMERA ? "scaleX(-1)" : "none",
          }}
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
            disabled={
              startingCamera ||
              disabled ||
              (devices.length === 0 && !selectedDeviceId)
            }
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
