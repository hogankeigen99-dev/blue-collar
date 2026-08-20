import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export const ROLE_ORDER: Role[] = ["TECHNICIAN", "MANAGER", "ADMIN", "OWNER"];

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
