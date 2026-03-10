import { db } from "@/lib/db";
import { adminAlerts, adminSettings } from "@/lib/db/schema";
import { createAdminRealtimeEvent } from "@/lib/admin/events";
import { notifyAdminEvent } from "@/lib/socket-internal";
import { and, eq } from "drizzle-orm";

export type AlertThresholds = {
  backlogThreshold: number;
  failedJobsThreshold: number;
  paymentFailureThreshold: number;
  staleWorkerMinutes: number;
};

type AlertInput = {
  message: string;
  metadata?: Record<string, unknown>;
  observedValue: number;
  severity: "critical" | "info" | "warning";
  source: string;
  thresholdValue: number;
  title: string;
};

function parseRecipients(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function dispatchSlackAlert(title: string, message: string) {
  const webhookUrl = process.env.ADMIN_SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      body: JSON.stringify({
        text: `Orvex Admin Alert: ${title}\n${message}`,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    console.error("[AdminAlerts] Failed to dispatch Slack alert", error);
  }
}

async function dispatchEmailAlert(title: string, message: string, source: string) {
  const recipients = parseRecipients(process.env.ADMIN_ALERT_EMAIL_TO);
  const from = process.env.ADMIN_ALERT_EMAIL_FROM?.trim() || "alerts@orvex.ai";
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const webhookUrl = process.env.ADMIN_ALERT_EMAIL_WEBHOOK_URL?.trim();

  if (recipients.length === 0) {
    return;
  }

  try {
    if (resendApiKey) {
      await fetch("https://api.resend.com/emails", {
        body: JSON.stringify({
          from,
          subject: `Orvex Alert: ${title}`,
          text: `${message}\n\nSource: ${source}`,
          to: recipients,
        }),
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      return;
    }

    if (webhookUrl) {
      await fetch(webhookUrl, {
        body: JSON.stringify({
          from,
          message,
          source,
          title,
          to: recipients,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    }
  } catch (error) {
    console.error("[AdminAlerts] Failed to dispatch email alert", error);
  }
}

export class AdminAlertService {
  static async getAlertThresholds(): Promise<AlertThresholds> {
    const existing = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, "alert_thresholds"),
    });

    const value = (existing?.value ?? {}) as Record<string, unknown>;

    return {
      backlogThreshold: Number(value.backlogThreshold ?? 40),
      failedJobsThreshold: Number(value.failedJobsThreshold ?? 5),
      paymentFailureThreshold: Number(value.paymentFailureThreshold ?? 1),
      staleWorkerMinutes: Number(value.staleWorkerMinutes ?? 3),
    };
  }

  static async ensureAlert(input: AlertInput) {
    const existing = await db.query.adminAlerts.findFirst({
      where: and(
        eq(adminAlerts.source, input.source),
        eq(adminAlerts.title, input.title),
        eq(adminAlerts.status, "open"),
      ),
    });

    if (existing) {
      return existing;
    }

    const [created] = await db.insert(adminAlerts).values({
      message: input.message,
      metadata: input.metadata ?? {},
      observedValue: input.observedValue,
      severity: input.severity,
      source: input.source,
      thresholdValue: input.thresholdValue,
      title: input.title,
      updatedAt: new Date(),
    }).returning();

    notifyAdminEvent(createAdminRealtimeEvent({
      action: "created",
      entity: "alert",
      entityId: created.id,
      payload: {
        severity: created.severity,
        source: created.source,
        title: created.title,
      },
      type: "admin.alert.created",
    }));

    await Promise.all([
      dispatchSlackAlert(created.title, created.message),
      dispatchEmailAlert(created.title, created.message, created.source),
    ]);

    return created;
  }
}
