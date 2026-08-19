"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword, ROLE_ORDER } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export async function createUser(formData: FormData) {
  const actor = await requireRole("ADMIN");

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "TECHNICIAN") as Role;

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and an 8+ character password are required");
  }
  if (!ROLE_ORDER.includes(role)) {
    throw new Error("Invalid role");
  }
  if (ROLE_ORDER.indexOf(role) > ROLE_ORDER.indexOf(actor.role)) {
    throw new Error("You cannot grant a role higher than your own");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with that email already exists");

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { organizationId: actor.organizationId, name, email, passwordHash, role },
  });

  await logActivity({
    organizationId: actor.organizationId,
    actorUserId: actor.id,
    action: "user.created",
    summary: `${actor.name} added ${user.name} as ${role}`,
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const actor = await requireRole("ADMIN");
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
