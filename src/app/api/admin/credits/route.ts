import { NextResponse } from "next/server";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { getRequestIp } from "@/lib/request";
import { AdminCreditsService } from "@server/services/admin/admin-credits-service";

export async function GET(request: Request) {
  try {
    await requireAdminApiSession("admin.finance.read");
    const { searchParams } = new URL(request.url);
    const balances = await AdminCreditsService.listCreditBalances({
      limit: Number(searchParams.get("balanceLimit") ?? 120),
      query: searchParams.get("query"),
    });
    const records = await AdminCreditsService.listBillingRecords({
      limit: Number(searchParams.get("ledgerLimit") ?? 120),
      type: (searchParams.get("type") as "adjustment" | "credits" | "refund" | "subscription" | null) ?? undefined,
      userId: searchParams.get("userId"),
    });

    return NextResponse.json({ balances, records });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAdminApiSession("admin.users.write", request);
    const body = await request.json() as
      | {
        action: "adjust";
        amount: number;
        notes?: string | null;
        userId: string;
      }
      | {
        action: "refund";
        amountCents: number;
        creditsAmount: number;
        notes?: string | null;
        userId: string;
      };

    if (body.action === "adjust") {
      await AdminCreditsService.adjustCredits({
        actorUserId: session.user.id,
        amount: body.amount,
        ipAddress: getRequestIp(request),
        notes: body.notes ?? null,
        userId: body.userId,
      });
    } else {
      await AdminCreditsService.refundCredits({
        actorUserId: session.user.id,
        amountCents: body.amountCents,
        creditsAmount: body.creditsAmount,
        ipAddress: getRequestIp(request),
        notes: body.notes ?? null,
        userId: body.userId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
