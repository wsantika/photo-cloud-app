"use client";

import { FormEvent, useState } from "react";

export default function UploadTestPage() {
  const [eventId, setEventId] = useState("");
  const [photoSessionId, setPhotoSessionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!file || !eventId || !photoSessionId) {
      setMessage("eventId, photoSessionId, dan file wajib diisi");
      return;
    }

    setLoading(true);

    try {
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
        setMessage(result.message || "Upload gagal");
        return;
      }

      setMessage("Upload berhasil");
      console.log("Upload result:", result);

      setFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Terjadi kesalahan saat upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-xl rounded-2xl border p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">Upload Test</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Event ID</label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Masukkan eventId"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Photo Session ID
            </label>
            <input
              type="text"
              value={photoSessionId}
              onChange={(e) => setPhotoSessionId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Masukkan photoSessionId"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Photo File</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          {message ? <p className="text-sm">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload Photo"}
          </button>
        </form>
      </div>
    </main>
  );
}
