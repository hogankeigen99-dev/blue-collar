import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logActivity(params: {
  organizationId: string;
  actorUserId?: string | null;
  projectId?: string | null;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId ?? null,
      projectId: params.projectId ?? null,
      action: params.action,
      summary: params.summary,
      metadata: (params.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}
