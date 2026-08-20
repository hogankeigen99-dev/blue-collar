"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseForm } from "@/lib/validation";
import { createScheduleEntrySchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export async function createScheduleEntry(formData: FormData) {
  const user = await requireUser();
  const { projectId, userId, startAt, endAt, notes } = parseForm(
    createScheduleEntrySchema,
    formData
  );

  const [project, technician] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, organizationId: user.organizationId } }),
    prisma.user.findFirst({ where: { id: userId, organizationId: user.organizationId } }),
  ]);
  if (!project || !technician) throw new Error("Project or technician not found");

  await prisma.scheduleEntry.create({
    data: {
      organizationId: user.organizationId,
      projectId,
      userId,
      startAt,
      endAt,
      notes,
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    actorUserId: user.id,
    action: "schedule.created",
    summary: `${user.name} scheduled ${technician.name} on "${project.title}"`,
  });

  revalidatePath("/schedule");
  revalidatePath(`/projects/${projectId}/schedule`);
}

export async function deleteScheduleEntry(entryId: string) {
  const user = await requireUser();
  const entry = await prisma.scheduleEntry.findFirst({
    where: { id: entryId, organizationId: user.organizationId },
  });
  if (!entry) throw new Error("Schedule entry not found");

  await prisma.scheduleEntry.delete({ where: { id: entryId } });
  revalidatePath("/schedule");
  revalidatePath(`/projects/${entry.projectId}/schedule`);
}
