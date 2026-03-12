import { isIP } from "node:net";

function normalizeIp(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  return isIP(trimmed) ? trimmed : null;
}

function parseForwardedFor(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => normalizeIp(entry))
    .filter((entry): entry is string => Boolean(entry));
}

export function getRequestIp(request: Request) {
  const cloudflareIp = normalizeIp(request.headers.get("cf-connecting-ip"));
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  const forwardedFor = parseForwardedFor(request.headers.get("x-forwarded-for"));
  if (forwardedFor.length > 0) {
    // The left-most X-Forwarded-For entry is the original client IP.
    return forwardedFor[0];
  }

  return "unknown";
}
