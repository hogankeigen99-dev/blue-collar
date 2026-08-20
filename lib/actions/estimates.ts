"use server";

import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { parseForm, parseValue } from "@/lib/validation";
import { createEstimateSchema, addLineItemSchema, estimateStatusSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEstimate(formData: FormData) {
  const user = await requireCapability("manage_pipeline");
  const data = parseForm(createEstimateSchema, formData);

  const estimate = await prisma.estimate.create({
    data: { organizationId: user.organizationId, ...data },
  });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "estimate.created",
    summary: `${user.name} created estimate "${estimate.title}"`,
  });

  revalidatePath("/estimates");
  redirect(`/estimates/${estimate.id}`);
}

export async function createEstimateFromLead(leadId: string) {
  const user = await requireCapability("manage_pipeline");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId },
  });
  if (!lead) throw new Error("Lead not found");

  const estimate = await prisma.estimate.create({
    data: {
      organizationId: user.organizationId,
      leadId: lead.id,
      customerId: lead.customerId,
      title: `Estimate for ${lead.name}`,
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "estimate.created",
    summary: `${user.name} created an estimate from lead "${lead.name}"`,
  });

  revalidatePath(`/leads/${leadId}`);
  redirect(`/estimates/${estimate.id}`);
}

export async function addLineItem(estimateId: string, formData: FormData) {
  const user = await requireCapability("manage_pipeline");
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId: user.organizationId },
  });
  if (!estimate) throw new Error("Estimate not found");

  const { description, quantity, unitPrice } = parseForm(addLineItemSchema, formData);

  const lastItem = await prisma.estimateLineItem.findFirst({
    where: { estimateId },
    orderBy: { position: "desc" },
  });

  await prisma.estimateLineItem.create({
    data: {
      estimateId,
      description,
      quantity,
      unitPrice,
      position: (lastItem?.position ?? 0) + 1,
    },
  });

  revalidatePath(`/estimates/${estimateId}`);
}

export async function removeLineItem(estimateId: string, lineItemId: string) {
  const user = await requireCapability("manage_pipeline");
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId: user.organizationId },
  });
  if (!estimate) throw new Error("Estimate not found");

  const lineItem = await prisma.estimateLineItem.findFirst({
    where: { id: lineItemId, estimateId },
  });
  if (!lineItem) throw new Error("Line item not found");

  await prisma.estimateLineItem.delete({ where: { id: lineItemId } });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function updateEstimateStatus(estimateId: string, formData: FormData) {
  const user = await requireCapability("manage_pipeline");
  const status = parseValue(estimateStatusSchema, formData.get("status"));

  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId: user.organizationId },
  });
  if (!estimate) throw new Error("Estimate not found");

  await prisma.estimate.update({ where: { id: estimateId }, data: { status } });

  await logActivity({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "estimate.status_changed",
    summary: `${user.name} changed estimate "${estimate.title}" from ${estimate.status} to ${status}`,
  });

  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath("/estimates");
}

export async function convertEstimateToProject(estimateId: string) {
  const user = await requireCapability("manage_pipeline");
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId: user.organizationId },
  });
  if (!estimate) throw new Error("Estimate not found");
  if (estimate.status !== "APPROVED") throw new Error("Only approved estimates can convert to a project");
  if (estimate.projectId) throw new Error("This estimate has already been converted");

  const project = await prisma.project.create({
    data: {
      organizationId: user.organizationId,
      title: estimate.title,
      description: estimate.notes,
      customerId: estimate.customerId,
      createdByUserId: user.id,
    },
  });

  await prisma.estimate.update({ where: { id: estimateId }, data: { projectId: project.id } });

  if (estimate.leadId) {
    await prisma.lead.update({ where: { id: estimate.leadId }, data: { status: "WON" } });
  }

  await logActivity({
    organizationId: user.organizationId,
    projectId: project.id,
    actorUserId: user.id,
    action: "estimate.converted",
    summary: `${user.name} converted estimate "${estimate.title}" into a project`,
  });

  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/projects/${project.id}`);
}
