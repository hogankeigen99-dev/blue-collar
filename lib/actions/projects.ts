"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { parseForm, parseValue } from "@/lib/validation";
import { createProjectSchema, projectStatusSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const user = await requireRole("MANAGER");
  const data = parseForm(createProjectSchema, formData);

  const project = await prisma.project.create({
    data: {
      organizationId: user.organizationId,
      ...data,
      createdByUserId: user.id,
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    projectId: project.id,
    actorUserId: user.id,
    action: "project.created",
    summary: `${user.name} created project "${project.title}"`,
  });

  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(projectId: string, formData: FormData) {
  const user = await requireUser();
  const status = parseValue(projectStatusSchema, formData.get("status"));

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) throw new Error("Project not found");

  await prisma.project.update({ where: { id: projectId }, data: { status } });

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    actorUserId: user.id,
    action: "project.status_changed",
    summary: `${user.name} changed status from ${project.status} to ${status}`,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function deleteProject(projectId: string) {
  const user = await requireRole("MANAGER");
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) throw new Error("Project not found");

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}
