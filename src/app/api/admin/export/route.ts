import { NextResponse } from "next/server";
import { db, pool } from "@/lib/db";
import { adminAuditLogs } from "@/lib/db/schema";
import { createAdminErrorResponse, requireAdminApiSession } from "@/lib/admin-api";
import { desc } from "drizzle-orm";
import { AdminCreditsService } from "@server/services/admin/admin-credits-service";
import { AdminDashboardService } from "@server/services/admin/admin-dashboard-service";
import { AdminModerationService } from "@server/services/admin/admin-moderation-service";
import { AdminUsersService } from "@server/services/admin/admin-users-service";

type ExportFormat = "csv" | "json" | "pdf";
type ExportDataset =
  | "audit"
  | "ai_outputs"
  | "billing"
  | "credits"
  | "listings"
  | "listing_templates"
  | "revenue"
  | "usage"
  | "users";

function escapeCsv(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "No data\n";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ];

  return `${lines.join("\n")}\n`;
}

function buildSimplePdf(lines: string[]) {
  const safeLines = lines.map((line) =>
    line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)"),
  );
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 780 Td",
    ...safeLines.flatMap((line, index) => index === 0
      ? [`(${line}) Tj`]
      : ["0 -16 Td", `(${line}) Tj`]),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}

async function getDataset(dataset: ExportDataset) {
  switch (dataset) {
    case "users":
      return AdminUsersService.listUsers({ limit: 200 });
    case "revenue":
      return AdminDashboardService.getFinanceSnapshot();
    case "usage":
      return AdminDashboardService.getOverview();
    case "listings":
      return AdminModerationService.getModerationSnapshot();
    case "listing_templates":
      return AdminModerationService.getModerationSnapshot();
    case "credits":
      return AdminCreditsService.listCreditBalances({ limit: 200 });
    case "billing":
      return AdminCreditsService.listBillingRecords({ limit: 200 });
    case "ai_outputs":
      return pool.query(`
        select
          w.id,
          w.type,
          w.status,
          w.source_provider as "sourceProvider",
          w.source_url as "sourceUrl",
          w.created_at as "createdAt",
          w.updated_at as "updatedAt",
          w.input_data as "inputData",
          w.result_data as "resultData",
          u.email
        from workflows w
        inner join users u on u.id = w.user_id
        where w.status = 'completed'
          and w.result_data is not null
        order by w.created_at desc
        limit 200
      `);
    case "audit":
      return db.query.adminAuditLogs.findMany({
        limit: 200,
        orderBy: [desc(adminAuditLogs.createdAt)],
      });
  }
}

function normalizeDataset(dataset: ExportDataset, data: unknown) {
  switch (dataset) {
    case "users":
      return data as Array<Record<string, unknown>>;
    case "revenue": {
      const finance = data as Awaited<ReturnType<typeof AdminDashboardService.getFinanceSnapshot>>;
      return finance.topPayingUsers.map((row) => ({
        email: row.email,
        revenueCents: row.revenueCents,
        userId: row.userId,
      }));
    }
    case "usage": {
      const overview = data as Awaited<ReturnType<typeof AdminDashboardService.getOverview>>;
      return overview.featureUsage.map((row) => ({
        feature: row.feature,
        requests: row.requests,
        tokens: row.tokens,
      }));
    }
    case "listings": {
      const moderation = data as Awaited<ReturnType<typeof AdminModerationService.getModerationSnapshot>>;
      return moderation.lowListings.map((row) => ({
        conversionScore: row.conversionScore,
        email: row.email,
        keywordCoverage: row.keywordCoverage,
        listingScore: row.listingScore,
        listingTitle: row.listingTitle,
        seoScore: row.seoScore,
        sourceUrl: row.sourceUrl,
      }));
    }
    case "listing_templates": {
      const moderation = data as Awaited<ReturnType<typeof AdminModerationService.getModerationSnapshot>>;
      return moderation.topListings.map((row) => ({
        conversionScore: row.conversionScore,
        email: row.email,
        keywordCoverage: row.keywordCoverage,
        listingScore: row.listingScore,
        listingTitle: row.listingTitle,
        optimizedDescription: row.optimizedDescription,
        optimizedTitle: row.optimizedTitle,
        suggestedTags: row.suggestedTags,
        seoScore: row.seoScore,
        sourceUrl: row.sourceUrl,
      }));
    }
    case "credits":
      return data as Array<Record<string, unknown>>;
    case "billing":
      return data as Array<Record<string, unknown>>;
    case "ai_outputs": {
      const rows = data as { rows: Array<Record<string, unknown>> };
      return rows.rows.map((row) => ({
        createdAt: row.createdAt,
        email: row.email,
        id: row.id,
        inputData: JSON.stringify(row.inputData ?? {}),
        resultData: JSON.stringify(row.resultData ?? {}),
        sourceProvider: row.sourceProvider,
        sourceUrl: row.sourceUrl,
        status: row.status,
        type: row.type,
        updatedAt: row.updatedAt,
      }));
    }
    case "audit":
      return (data as Array<Record<string, unknown>>).map((row) => ({
        action: row.action,
        actorUserId: row.actorUserId,
        createdAt: row.createdAt,
        entityId: row.entityId,
        entityType: row.entityType,
        result: row.result,
      }));
  }
}

export async function GET(request: Request) {
  try {
    await requireAdminApiSession("admin.export");
    const { searchParams } = new URL(request.url);
    const dataset = (searchParams.get("dataset") ?? "users") as ExportDataset;
    const format = (searchParams.get("format") ?? "json") as ExportFormat;
    const rawData = await getDataset(dataset);
    const rows = normalizeDataset(dataset, rawData);

    if (format === "json") {
      return NextResponse.json({ dataset, rows });
    }

    if (format === "csv") {
      return new NextResponse(toCsv(rows), {
        headers: {
          "Content-Disposition": `attachment; filename="${dataset}.csv"`,
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }

    const pdf = buildSimplePdf([
      `ORVEX Admin Export: ${dataset}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      ...rows.slice(0, 40).map((row) => JSON.stringify(row)),
    ]);

    return new NextResponse(pdf, {
      headers: {
        "Content-Disposition": `attachment; filename="${dataset}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return createAdminErrorResponse(error);
  }
}
