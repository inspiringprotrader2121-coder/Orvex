const defaultOrigin = (() => {
  try {
    return new URL((process.env.NEXT_PUBLIC_APP_URL || "https://useorvex.com").trim()).origin;
  } catch {
    return "https://useorvex.com";
  }
})();

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildAllowedOrigins() {
  const origins = new Set<string>([defaultOrigin]);

  const explicitList = (process.env.ALLOWED_APP_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  explicitList.forEach((entry) => origins.add(entry));

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

const allowedOrigins = buildAllowedOrigins();

export class InvalidOriginError extends Error {
  constructor(message = "Invalid request origin") {
    super(message);
    this.name = "InvalidOriginError";
  }
}

function isOriginAllowed(candidate: string | null, requestOrigin: string) {
  const normalized = normalizeOrigin(candidate);
  if (!normalized) {
    return false;
  }

  return normalized === requestOrigin || allowedOrigins.has(normalized);
}

export function assertSameOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");

  if (originHeader) {
    if (!isOriginAllowed(originHeader, requestOrigin)) {
      throw new InvalidOriginError();
    }
    return;
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    if (!isOriginAllowed(refererHeader, requestOrigin)) {
      throw new InvalidOriginError();
    }
    return;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new InvalidOriginError();
  }

  if (fetchSite === "same-origin" || fetchSite === "same-site") {
    return;
  }

  // Allow requests without CORS metadata (CLI requests, server-to-server, etc.).
}
