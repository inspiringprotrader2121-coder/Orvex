import { NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { credits, users } from "@/lib/db/schema";
import { consumeRegisterAttempt } from "@/lib/auth-rate-limit";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const rateLimit = await consumeRegisterAttempt(request, normalizedEmail || "anonymous");

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail)
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        email: normalizedEmail,
        passwordHash,
        credits: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning({ id: users.id });

      await tx.insert(credits).values({
        creditsAvailable: 5,
        creditsUsed: 0,
        updatedAt: new Date(),
        userId: user.id,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.'
    });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
