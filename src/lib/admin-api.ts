import { NextResponse } from "next/server";
import { AdminAuthorizationError, requireAdminPermission } from "@/lib/admin-auth";
import { assertSameOrigin, InvalidOriginError } from "@/lib/origin";

export function createAdminErrorResponse(error: unknown) {
  if (error instanceof InvalidOriginError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json({ error: error.message }, {
      status: error.message === "Unauthorized" ? 401 : 403,
    });
  }

  console.error("[AdminAPI] Request failed:", error);
  return NextResponse.json({ error: "Admin request failed" }, { status: 500 });
}

export async function requireAdminApiSession(permission = "admin.access", request?: Request) {
  if (request && request.method !== "GET" && request.method !== "HEAD") {
    assertSameOrigin(request);
  }

  return requireAdminPermission(permission);
}
