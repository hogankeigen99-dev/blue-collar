"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { requestPasswordResetSchema, setPasswordSchema } from "@/lib/schemas";
import { createAuthToken, consumeAuthToken } from "@/lib/tokens";
import { sendEmail, appUrl } from "@/lib/email";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { redirect } from "next/navigation";

export type RequestResetState = { message?: string; error?: string };

const GENERIC_MESSAGE = "If that email has an account, we've sent a password reset link.";

export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const parsed = requestPasswordResetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email } = parsed.data;

  const rateLimitKey = `reset:${email}`;
  if (!checkRateLimit(rateLimitKey)) {
    // Same generic message — don't let the lockout itself leak whether the account exists.
    return { message: GENERIC_MESSAGE };
  }
  recordFailedAttempt(rateLimitKey);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.active) {
    const token = await createAuthToken(user.id, "PASSWORD_RESET");
    const link = `${appUrl()}/set-password?token=${token}`;

    const { sent } = await sendEmail({
      to: email,
      subject: "Reset your Blue Collar password",
      html: `<p>Someone requested a password reset for this account.</p><p><a href="${link}">Reset your password</a></p><p>If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>`,
    });

    // Never expose the link in the response — only the account owner's inbox
    // should see it. Without email configured, log server-side for an
    // operator to retrieve manually.
    if (!sent) {
      console.warn(`[password-reset] RESEND_API_KEY not set. Link for ${email}: ${link}`);
    }
  }

  return { message: GENERIC_MESSAGE };
}

export type SetPasswordState = { error?: string };

export async function setPasswordWithToken(
  _prevState: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { token, password } = parsed.data;

  const result = await consumeAuthToken(token);
  if (!result) {
    return { error: "This link is invalid or has expired. Request a new one." };
  }
  const { user, type } = result;

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: type === "INVITE" ? "user.invite_accepted" : "user.password_reset",
    summary:
      type === "INVITE"
        ? `${user.name} accepted their invite and set a password`
        : `${user.name} reset their password`,
  });

  await createSession(user.id);
  redirect("/");
}
