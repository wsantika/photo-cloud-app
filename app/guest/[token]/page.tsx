import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function GuestPage({ params }: Props) {
  const { token } = await params;

  const event = await prisma.event.findUnique({
    where: {
      qrToken: token,
    },
  });

  if (!event) {
    notFound();
  }

  const guestSession = await prisma.guestSession.create({
    data: {
      eventId: event.id,
      sessionKey: randomUUID(),
    },
  });

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border p-6 shadow">
        <h1 className="text-2xl font-bold">Welcome Guest</h1>
        <p className="mt-2 text-sm text-gray-500">
          Guest session berhasil dibuat.
        </p>

        <div className="mt-4 space-y-2">
          <p>
            <span className="font-semibold">Event:</span> {event.title}
          </p>
          <p>
            <span className="font-semibold">Date:</span>{" "}
            {new Date(event.eventDate).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Location:</span>{" "}
            {event.location || "-"}
          </p>
          <p>
            <span className="font-semibold">Guest Session ID:</span>{" "}
            {guestSession.id}
          </p>
        </div>
      </div>
    </main>
  );
}
