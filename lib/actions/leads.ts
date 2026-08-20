"use server";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { parseForm, parseValue } from "@/lib/validation";
import { createLeadSchema, leadStatusSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createLead(formData: FormData) {
  const user = await requireCapability("manage_pipeline");
  const data = parseForm(createLeadSchema, formData);

  const lead = await prisma.lead.create({
    data: { organizationId: user.organizationId, ...data },
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
  const user = await requireCapability("manage_pipeline");
  const status = parseValue(leadStatusSchema, formData.get("status"));

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
  });
  if (!lead) throw new Error("Lead not found");

  await prisma.lead.update({ where: { id: leadId }, data: { status } });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "lead.status_changed",
    summary: `${user.name} changed lead "${lead.name}" from ${lead.status} to ${status}`,
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
