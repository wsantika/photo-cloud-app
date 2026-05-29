import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRequiredRole } from "@/lib/rbac";
import { slugify } from "@/lib/utils";



export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasRequiredRole(session.user.role, ["admin", "vendor"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, eventDate, location } = body;

    if (!title || !eventDate) {
      return NextResponse.json(
        { message: "Title dan event date wajib diisi" },
        { status: 400 },
      );
    }

    const baseSlug = slugify(title);
    const uniqueSlug = `${baseSlug}-${Date.now()}`;

    const event = await prisma.event.create({
      data: {
        title,
        slug: uniqueSlug,
        description: description || null,
        eventDate: new Date(eventDate),
        location: location || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(
      { message: "Event berhasil dibuat", data: event },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat event" },
      { status: 500 },
    );
  }
}
