"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function createLead(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const lead = await prisma.lead.create({
    data: {
      organizationId: user.organizationId,
      name,
      contactName: str(formData, "contactName"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      source: str(formData, "source"),
      notes: str(formData, "notes"),
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "lead.created",
    summary: `${user.name} added lead "${lead.name}"`,
  });

  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStatus(leadId: string, formData: FormData) {
  const user = await requireUser();
  const status = formData.get("status");
  if (typeof status !== "string") return;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
  });
  if (!lead) throw new Error("Lead not found");

  await prisma.lead.update({ where: { id: leadId }, data: { status: status as never } });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "lead.status_changed",
    summary: `${user.name} changed lead "${lead.name}" from ${lead.status} to ${status}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
