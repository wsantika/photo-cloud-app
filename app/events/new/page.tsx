"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          eventDate,
          location,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Gagal membuat event");
        setLoading(false);
        return;
      }

      setSuccess("Event berhasil dibuat");
      setTitle("");
      setDescription("");
      setEventDate("");
      setLocation("");
      router.refresh();

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch {
      setError("Terjadi kesalahan saat mengirim data");
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border p-6 shadow">
        <h1 className="mb-2 text-2xl font-bold">Create Event</h1>
        <p className="mb-6 text-sm text-gray-500">
          Buat event baru untuk photobooth wedding
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Wedding Adit & Siska"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi event"
              rows={4}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Event Date</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border px-3 py-2 outline-none"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lokasi event"
            />
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {success ? <p className="text-sm text-green-600">{success}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Event"}
          </button>
        </form>
      </div>
    </main>
  );
}
