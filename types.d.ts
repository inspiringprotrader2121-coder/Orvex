import { Pool } from 'pg';
import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

type AppUserRole = "super_admin" | "admin" | "moderator" | "user";
type AppUserStatus = "active" | "suspended" | "deleted";
type AppSubscriptionTier = "free" | "starter" | "pro" | "growth" | "enterprise";

declare global {
  var dbPool: Pool | undefined;
}

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppUserRole;
      status: AppUserStatus;
      subscriptionTier: AppSubscriptionTier;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: AppUserRole;
    status?: AppUserStatus;
    subscriptionTier?: AppSubscriptionTier;
  }
}

export {};
