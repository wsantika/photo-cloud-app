import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasRequiredRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasRequiredRole(session.user.role, ["admin"])) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ message: "Welcome admin" });
}
