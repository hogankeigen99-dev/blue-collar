"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { redirect } from "next/navigation";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "org"
  );
}

export type AuthState = { error?: string };

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const orgName = String(formData.get("orgName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!orgName || !name || !email || password.length < 8) {
    return { error: "All fields are required and password must be at least 8 characters" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists" };
  }

  const baseSlug = slugify(orgName);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const passwordHash = await hashPassword(password);

  const { org, user } = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName, slug } });
    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        name,
        email,
        passwordHash,
        role: "OWNER",
      },
    });
    return { org, user };
  });

  await logActivity({
    organizationId: org.id,
    actorUserId: user.id,
    action: "organization.created",
    summary: `${name} created ${org.name}`,
  });

  await createSession(user.id);
  redirect("/");
}

export async function logIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logOut() {
  await destroySession();
  redirect("/login");
}
