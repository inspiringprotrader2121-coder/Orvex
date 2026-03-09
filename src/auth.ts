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
          const [{ db }, { users }, { eq }] = await Promise.all([
            import("@/lib/db"),
            import("@/lib/db/schema"),
            import("drizzle-orm"),
          ]);

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

          await clearFailedLoginAttempts(request, email);

          return {
            id: user.id,
            email: user.email,
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
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
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
