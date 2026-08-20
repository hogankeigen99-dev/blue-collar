const FROM_EMAIL = process.env.EMAIL_FROM || "Blue Collar <onboarding@resend.dev>";

/**
 * Sends via the Resend HTTP API directly (no SDK dependency). If
 * RESEND_API_KEY isn't set, this is a no-op — callers should fall back to
 * showing the link/token directly so the flow still works without email
 * configured.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  return { sent: res.ok };
}

export function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}
