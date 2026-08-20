"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCapability, hashPassword, assignableRoles } from "@/lib/auth";
import { parseForm } from "@/lib/validation";
import { createUserSchema } from "@/lib/schemas";
import { createAuthToken } from "@/lib/tokens";
import { sendEmail, appUrl } from "@/lib/email";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export type CreateUserState = { error?: string; inviteLink?: string };

export async function createUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const actor = await requireCapability("manage_users");

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, role } = parsed.data;

  if (!assignableRoles(actor.role).includes(role)) {
    return { error: "You cannot grant that role" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with that email already exists" };
  }

  // Unusable placeholder — nobody knows this plaintext, so login is
  // impossible until the invite link is used to set a real password.
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));

  const user = await prisma.user.create({
    data: { organizationId: actor.organizationId, name, email, passwordHash, role },
  });

  const token = await createAuthToken(user.id, "INVITE");
  const inviteLink = `${appUrl()}/set-password?token=${token}`;

  const { sent } = await sendEmail({
    to: email,
    subject: "You've been invited to Blue Collar",
    html: `<p>${actor.name} invited you to join ${role === "OWNER" ? "an" : "their"} organization on Blue Collar.</p><p><a href="${inviteLink}">Set your password to get started</a></p><p>This link expires in 7 days.</p>`,
  });

  await logActivity({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user.created",
    summary: `${actor.name} invited ${user.name} as ${role}`,
  });

  revalidatePath("/users");
  return sent ? {} : { inviteLink };
}

export async function setUserActive(userId: string, active: boolean) {
  const actor = await requireCapability("manage_users");
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: actor.organizationId },
  });
  if (!target) throw new Error("User not found");
  if (target.id === actor.id) throw new Error("You cannot deactivate your own account");

  await prisma.user.update({ where: { id: userId }, data: { active } });

  await logActivity({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: active ? "user.activated" : "user.deactivated",
    summary: `${actor.name} ${active ? "reactivated" : "deactivated"} ${target.name}`,
  });

  revalidatePath("/users");
}
