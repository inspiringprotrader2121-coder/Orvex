import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getErrorMessage } from "@/lib/errors";
import {
  AuthRateLimitError,
  assertLoginAttemptAllowed,
  clearFailedLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/auth-rate-limit";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const email = String(credentials.email).trim().toLowerCase();
          const password = String(credentials.password);
          await assertLoginAttemptAllowed(request, email);

          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user || !user.passwordHash) {
            await recordFailedLoginAttempt(request, email);
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            await recordFailedLoginAttempt(request, email);
            return null;
          }

          if (user.status !== "active") {
            return null;
          }

          await clearFailedLoginAttempts(request, email);
          await db.update(users).set({
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(users.id, user.id));

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            subscriptionTier: user.subscriptionTier,
          };
        } catch (error) {
          if (error instanceof AuthRateLimitError) {
            throw error;
          }

          console.error("Credentials authorize failed:", getErrorMessage(error));
          throw new Error("AUTH_SERVICE_UNAVAILABLE");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const appUser = user as typeof user & {
          role?: "super_admin" | "admin" | "moderator" | "user";
          status?: "active" | "suspended" | "deleted";
          subscriptionTier?: "free" | "starter" | "pro" | "growth" | "enterprise";
        };
        token.id = user.id;
        token.role = appUser.role;
        token.status = appUser.status;
        token.subscriptionTier = appUser.subscriptionTier;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "user";
        session.user.status = token.status ?? "active";
        session.user.subscriptionTier = token.subscriptionTier ?? "free";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.AUTH_SECRET,
});
