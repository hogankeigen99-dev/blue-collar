"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export async function addProjectMember(projectId: string, formData: FormData) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) throw new Error("Project not found");

  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "MEMBER") as "LEAD" | "MEMBER";
  if (!userId) throw new Error("Select a user");

  const member = await prisma.user.findFirst({
    where: { id: userId, organizationId: user.organizationId },
  });
  if (!member) throw new Error("User not found");

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role },
    create: { projectId, userId, role },
  });

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    actorUserId: user.id,
    action: "project.member_added",
    summary: `${user.name} added ${member.name} to the project as ${role}`,
  });

  revalidatePath(`/projects/${projectId}/team`);
}

export async function removeProjectMember(projectId: string, userId: string) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) throw new Error("Project not found");

  await prisma.projectMember.deleteMany({ where: { projectId, userId } });
  revalidatePath(`/projects/${projectId}/team`);
}
