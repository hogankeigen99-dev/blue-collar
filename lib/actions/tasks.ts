"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

async function getProjectInOrg(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) throw new Error("Project not found");
  return project;
}

export async function createTask(projectId: string, formData: FormData) {
  const user = await requireUser();
  await getProjectInOrg(projectId, user.organizationId);

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required");
  const assigneeUserId = String(formData.get("assigneeUserId") || "") || undefined;
  const dueDateRaw = String(formData.get("dueDate") || "");

  const lastTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
  });

  await prisma.task.create({
    data: {
      projectId,
      title,
      assigneeUserId,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
      position: (lastTask?.position ?? 0) + 1,
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    actorUserId: user.id,
    action: "task.created",
    summary: `${user.name} added task "${title}"`,
  });

  revalidatePath(`/projects/${projectId}/tasks`);
}

export async function updateTaskStatus(taskId: string, status: string) {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: user.organizationId } },
    include: { project: true },
  });
  if (!task) throw new Error("Task not found");

  await prisma.task.update({ where: { id: taskId }, data: { status: status as never } });

  await logActivity({
    organizationId: user.organizationId,
    projectId: task.projectId,
    actorUserId: user.id,
    action: "task.status_changed",
    summary: `${user.name} marked task "${task.title}" as ${status}`,
  });

  revalidatePath(`/projects/${task.projectId}/tasks`);
  revalidatePath("/field");
}

export async function deleteTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: user.organizationId } },
  });
  if (!task) throw new Error("Task not found");

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${task.projectId}/tasks`);
}
