"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseForm, parseValue } from "@/lib/validation";
import { createTaskSchema, taskStatusSchema } from "@/lib/schemas";
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
  const { title, assigneeUserId, dueDate } = parseForm(createTaskSchema, formData);

  if (assigneeUserId) {
    const assignee = await prisma.user.findFirst({
      where: { id: assigneeUserId, organizationId: user.organizationId },
    });
    if (!assignee) throw new Error("Assignee not found");
  }

  const lastTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
  });

  await prisma.task.create({
    data: {
      projectId,
      title,
      assigneeUserId,
      dueDate,
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
  const validStatus = parseValue(taskStatusSchema, status);
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { organizationId: user.organizationId } },
    include: { project: true },
  });
  if (!task) throw new Error("Task not found");

  await prisma.task.update({ where: { id: taskId }, data: { status: validStatus } });

  await logActivity({
    organizationId: user.organizationId,
    projectId: task.projectId,
    actorUserId: user.id,
    action: "task.status_changed",
    summary: `${user.name} marked task "${task.title}" as ${validStatus}`,
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
