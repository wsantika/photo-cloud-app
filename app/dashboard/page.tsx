import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const events = await prisma.event.findMany({
    where: {
      createdById: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border p-6 shadow">
          <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Nama:</span> {session.user.name}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {session.user.email}
            </p>
            <p>
              <span className="font-semibold">Role:</span> {session.user.role}
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/events/new"
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Create Event
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">My Events</h2>

          {events.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada event.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="rounded-xl border p-4">
                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.slug}</p>

                  {event.description ? (
                    <p className="mt-2 text-sm">{event.description}</p>
                  ) : null}

                  <div className="mt-3 space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Date:</span>{" "}
                      {new Date(event.eventDate).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{" "}
                      {event.location || "-"}
                    </p>
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
