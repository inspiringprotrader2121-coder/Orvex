import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { signSocketToken } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    token: signSocketToken(userId, session.user.role ?? "user"),
  });
}
