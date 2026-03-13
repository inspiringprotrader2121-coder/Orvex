"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();

function isPgUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

export async function updateEmail(newEmail: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsedEmail = emailSchema.safeParse(newEmail);
  if (!parsedEmail.success) {
    return { error: "Please enter a valid email address" };
  }

  const normalizedEmail = parsedEmail.data;

  try {
    const currentUser = await db.query.users.findFirst({
      columns: { id: true, email: true },
      where: eq(users.id, session.user.id),
    });

    if (!currentUser) {
      return { error: "User not found" };
    }

    if (currentUser.email === normalizedEmail) {
      return { success: "Email is already set to this value" };
    }

    const updated = await db
      .update(users)
      .set({ email: normalizedEmail, updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    if (!updated.length) {
      return { error: "Failed to update email" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/admin/settings");
    return { success: "Email updated successfully" };
  } catch (error: unknown) {
    if (isPgUniqueViolation(error)) {
      return { error: "Email is already in use" };
    }
    console.error("Update email error:", error);
    return { error: "Failed to update email" };
  }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  if (currentPassword === newPassword) {
    return { error: "New password must be different from current password" };
  }

  try {
    const user = await db.query.users.findFirst({
      columns: { id: true, passwordHash: true },
      where: eq(users.id, session.user.id),
    });

    if (!user || !user.passwordHash) return { error: "User not found" };

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return { error: "Incorrect current password" };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await db
      .update(users)
      .set({ passwordHash: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({ id: users.id });

    if (!updated.length) {
      return { error: "Failed to update password" };
    }

    return { success: "Password updated successfully" };
  } catch (error) {
    console.error("Update password error:", error);
    return { error: "Failed to update password" };
  }
}
