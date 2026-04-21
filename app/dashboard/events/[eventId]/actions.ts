"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createPhotoSession(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const eventId = formData.get("eventId")?.toString();
  const targetShotsValue = formData.get("targetShots")?.toString();

  if (!eventId || !targetShotsValue) {
    throw new Error("Event ID dan target shots wajib diisi.");
  }

  const targetShots = Number(targetShotsValue);

  if (Number.isNaN(targetShots) || targetShots <= 0) {
    throw new Error("Target shots harus berupa angka lebih dari 0.");
  }

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      createdById: session.user.id,
    },
  });

  if (!event) {
    throw new Error("Event tidak ditemukan atau bukan milik user.");
  }

  await prisma.photoSession.create({
    data: {
      eventId: event.id,
      createdById: session.user.id,
      targetShots,
      qrToken: randomUUID(),
      status: "pending",
    },
  });

  revalidatePath(`/dashboard/events/${event.id}`);
  revalidatePath(`/dashboard/events/${event.id}/photobooth`);
}
