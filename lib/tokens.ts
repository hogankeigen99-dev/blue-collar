import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { AuthTokenType, User } from "@prisma/client";

const TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token (embed it in the emailed/displayed link, never store it). */
export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS[type]),
    },
  });
  return token;
}

/**
 * Marks the token used and returns its owner (and type — INVITE vs
 * PASSWORD_RESET — in case a caller wants to distinguish), or null if
 * invalid/expired/already used.
 */
export async function consumeAuthToken(
  rawToken: string
): Promise<{ user: User; type: AuthTokenType } | null> {
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { user: record.user, type: record.type };
}
