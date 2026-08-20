"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { signUpSchema, logInSchema } from "@/lib/schemas";
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
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { orgName, name, email, password } = parsed.data;

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
  const parsed = logInSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const rateLimitKey = `login:${email}`;
  if (!checkRateLimit(rateLimitKey)) {
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    recordFailedAttempt(rateLimitKey);
    return { error: "Invalid email or password" };
  }

  clearRateLimit(rateLimitKey);
  await createSession(user.id);
  redirect("/");
}

export async function logOut() {
  await destroySession();
  redirect("/login");
}
