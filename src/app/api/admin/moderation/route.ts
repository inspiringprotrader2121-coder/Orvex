import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminModerationService } from "@server/services/admin/admin-moderation-service";

export async function GET() {
  try {
    await requireAdminApiSession("admin.moderation.read");
    const data = await AdminModerationService.getModerationSnapshot();
    return NextResponse.json(data);
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.moderation.write", request);
    const body = await request.json() as
      | {
        itemId: string;
        mode: "item";
        notes?: string | null;
        status: "approved" | "flagged" | "rejected";
      }
      | {
        mode: "template";
        status: "approved" | "flagged" | "rejected";
        templateId: string;
      };

    if (body.mode === "item") {
      await AdminModerationService.updateModerationItem({
        actorUserId: session.user.id,
        itemId: body.itemId,
        notes: body.notes,
        status: body.status,
      });
    } else {
      await AdminModerationService.updateTemplate({
        actorUserId: session.user.id,
        status: body.status,
        templateId: body.templateId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
