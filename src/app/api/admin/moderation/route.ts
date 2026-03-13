import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { AdminModerationPatchBodySchema } from "@server/schemas/admin-api";
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
    const body = AdminModerationPatchBodySchema.parse(await request.json());

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
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid moderation payload",
        issues: error.issues,
      }, { status: 400 });
    }

    return createAdminErrorResponse(error);
  }
}
