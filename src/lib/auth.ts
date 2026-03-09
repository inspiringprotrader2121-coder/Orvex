import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getRequiredServerEnv } from "@/lib/server-env";

function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() || getRequiredServerEnv("AUTH_SECRET");
}

export type SocketTokenRole = "internal" | "user";

export interface SocketTokenPayload extends JwtPayload {
  role: SocketTokenRole;
  sub: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: object, expiresIn: SignOptions["expiresIn"] = '1d'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyToken<T extends JwtPayload = JwtPayload>(token: string): T | null {
  try {
    return jwt.verify(token, getJwtSecret()) as T;
  } catch {
    return null;
  }
}

export function signSocketToken(subject: string, role: SocketTokenRole, expiresIn: SignOptions["expiresIn"] = "5m"): string {
  return signToken({ sub: subject, role }, expiresIn);
}

export function verifySocketToken(token: string): SocketTokenPayload | null {
  const payload = verifyToken<SocketTokenPayload>(token);

  if (!payload?.sub || (payload.role !== "user" && payload.role !== "internal")) {
    return null;
  }

  return payload;
}
