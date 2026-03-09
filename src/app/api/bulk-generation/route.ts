import { NextResponse } from "next/server";
import { parse as parseCsv } from "csv-parse/sync";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { getErrorMessage } from "@/lib/errors";
import {
  BulkGenerationInputSchema,
  BulkLaunchRowSchema,
  type BulkLaunchRow,
} from "@server/schemas/bulk-generation";
import { BulkGenerationService } from "@server/services/bulk-generation-service";
import { env } from "@server/utils/env";
import { RateLimitExceededError } from "@server/utils/errors";

async function extractRows(request: Request): Promise<{
  fileName: string;
  projectId?: string;
  rows: BulkLaunchRow[];
}> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = BulkGenerationInputSchema.parse(await request.json());
    return {
      fileName: "bulk-generation.json",
      projectId: body.projectId,
      rows: body.rows,
    };
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const projectIdValue = formData.get("projectId");
  const projectId = typeof projectIdValue === "string" && projectIdValue.trim() ? projectIdValue.trim() : undefined;

  if (!(file instanceof File)) {
    throw new Error("A CSV file is required");
  }

  const csvText = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const parsed = parseCsv(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;

  const rows = parsed.map((row) => BulkLaunchRowSchema.parse({
    audience: row.audience,
    category: row.category,
    description: row.description,
    keyword: row.keyword,
    productName: row.productName,
  }));

  return {
    fileName: file.name || "bulk-generation.csv",
    projectId,
    rows,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await extractRows(request);

    if (payload.rows.length > env.bulkLaunchMaxRows) {
      return NextResponse.json({
        error: `Bulk uploads are limited to ${env.bulkLaunchMaxRows} rows`,
      }, { status: 400 });
    }

    const result = await BulkGenerationService.startLaunchPackBatch({
      fileName: payload.fileName,
      projectId: payload.projectId,
      rows: payload.rows,
      userId,
    });

    return NextResponse.json({
      ...result,
      success: true,
    });
  } catch (error) {
    console.error("Bulk Generation Error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({
        error: "Invalid bulk generation payload",
        issues: error.issues,
      }, { status: 400 });
    }

    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json({ error: getErrorMessage(error, "Unable to queue bulk generation") }, { status: 500 });
  }
}
