"use client";

import { signOut, useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p className="p-6">Loading...</p>;
  }

  if (!session) {
    return <p className="p-6">Kamu belum login.</p>;
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border p-6 shadow">
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
          <p>
            <span className="font-semibold">User ID:</span> {session.user.id}
          </p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
