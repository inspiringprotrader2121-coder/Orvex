import { CredentialsSignin } from "next-auth";
import { env } from "@server/utils/env";
import { getRequestIp } from "@/lib/request";
import { getRateLimitState, incrementRateLimit, resetRateLimit } from "@/lib/rate-limit";

type RateLimitCheck = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitPolicy = {
  limit: number;
  prefix: string;
  windowSeconds: number;
};

const loginPolicies = {
  email: {
    limit: env.authLoginEmailLimit,
    prefix: "auth:login:email",
    windowSeconds: env.authLoginWindowSeconds,
  },
  ip: {
    limit: env.authLoginIpLimit,
    prefix: "auth:login:ip",
    windowSeconds: env.authLoginWindowSeconds,
  },
  identity: {
    limit: env.authLoginIdentityLimit,
    prefix: "auth:login:identity",
    windowSeconds: env.authLoginWindowSeconds,
  },
} satisfies Record<string, RateLimitPolicy>;

const registerPolicies = {
  email: {
    limit: env.authRegisterEmailLimit,
    prefix: "auth:register:email",
    windowSeconds: env.authRegisterWindowSeconds,
  },
  ip: {
    limit: env.authRegisterIpLimit,
    prefix: "auth:register:ip",
    windowSeconds: env.authRegisterWindowSeconds,
  },
} satisfies Record<string, RateLimitPolicy>;

export class AuthRateLimitError extends CredentialsSignin {
  code = "rate_limited";

  constructor() {
    super("Too many authentication attempts");
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildKey(policy: RateLimitPolicy, scope: string) {
  return `${policy.prefix}:${scope}`;
}

async function checkPolicies(policies: Array<{ key: string; policy: RateLimitPolicy }>): Promise<RateLimitCheck> {
  let retryAfterSeconds = 0;

  for (const { key, policy } of policies) {
    const state = await getRateLimitState(key);
    if (state.count >= policy.limit) {
      retryAfterSeconds = Math.max(retryAfterSeconds, state.retryAfterSeconds);
    }
  }

  return {
    allowed: retryAfterSeconds === 0,
    retryAfterSeconds,
  };
}

async function incrementPolicies(policies: Array<{ key: string; policy: RateLimitPolicy }>): Promise<RateLimitCheck> {
  let retryAfterSeconds = 0;
  let allowed = true;

  for (const { key, policy } of policies) {
    const state = await incrementRateLimit(key, policy.windowSeconds);
    if (state.count > policy.limit) {
      allowed = false;
      retryAfterSeconds = Math.max(retryAfterSeconds, state.retryAfterSeconds);
    }
  }

  return {
    allowed,
    retryAfterSeconds,
  };
}

export async function consumeRegisterAttempt(request: Request, email: string) {
  const ip = getRequestIp(request);
  const normalizedEmail = normalizeEmail(email || "anonymous");
  const policies = [
    { key: buildKey(registerPolicies.ip, ip), policy: registerPolicies.ip },
    { key: buildKey(registerPolicies.email, normalizedEmail), policy: registerPolicies.email },
  ];

  const existingState = await checkPolicies(policies);
  if (!existingState.allowed) {
    return existingState;
  }

  return incrementPolicies(policies);
}

export async function assertLoginAttemptAllowed(request: Request, email: string) {
  const ip = getRequestIp(request);
  const normalizedEmail = normalizeEmail(email);
  const policies = [
    { key: buildKey(loginPolicies.ip, ip), policy: loginPolicies.ip },
    { key: buildKey(loginPolicies.email, normalizedEmail), policy: loginPolicies.email },
    { key: buildKey(loginPolicies.identity, `${normalizedEmail}:${ip}`), policy: loginPolicies.identity },
  ];

  const result = await checkPolicies(policies);
  if (!result.allowed) {
    throw new AuthRateLimitError();
  }
}

export async function recordFailedLoginAttempt(request: Request, email: string) {
  const ip = getRequestIp(request);
  const normalizedEmail = normalizeEmail(email);
  const policies = [
    { key: buildKey(loginPolicies.ip, ip), policy: loginPolicies.ip },
    { key: buildKey(loginPolicies.email, normalizedEmail), policy: loginPolicies.email },
    { key: buildKey(loginPolicies.identity, `${normalizedEmail}:${ip}`), policy: loginPolicies.identity },
  ];

  const result = await incrementPolicies(policies);
  if (!result.allowed) {
    throw new AuthRateLimitError();
  }
}

export async function clearFailedLoginAttempts(request: Request, email: string) {
  const ip = getRequestIp(request);
  const normalizedEmail = normalizeEmail(email);

  await Promise.all([
    resetRateLimit(buildKey(loginPolicies.email, normalizedEmail)),
    resetRateLimit(buildKey(loginPolicies.identity, `${normalizedEmail}:${ip}`)),
  ]);
}
