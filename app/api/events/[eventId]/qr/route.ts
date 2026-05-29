import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRequiredRole } from "@/lib/rbac";

type Params = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(_: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!hasRequiredRole(session.user.role, ["admin", "vendor"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { message: "Event tidak ditemukan" },
        { status: 404 },
      );
    }

    const token = event.qrToken ?? randomUUID();

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        qrToken: token,
      },
    });

    const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
    const guestUrl = `${baseUrl}/guest/${token}`;
    const qrCodeDataUrl = await QRCode.toDataURL(guestUrl);

    return NextResponse.json({
      message: "QR code berhasil dibuat",
      data: {
        eventId: updatedEvent.id,
        token,
        guestUrl,
        qrCodeDataUrl,
      },
    });
  } catch (error) {
    console.error("Generate QR error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat generate QR" },
      { status: 500 },
    );
  }
}
