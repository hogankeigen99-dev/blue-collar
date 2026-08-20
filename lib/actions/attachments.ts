"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function uploadAttachment(projectId: string, formData: FormData) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: user.organizationId },
  });
  if (!project) throw new Error("Project not found");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File must be 10MB or smaller");
  }

  const orgDir = path.join(UPLOAD_ROOT, user.organizationId, projectId);
  await mkdir(orgDir, { recursive: true });

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const diskPath = path.join(orgDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  const publicPath = `/uploads/${user.organizationId}/${projectId}/${storedName}`;
  const kind = file.type.startsWith("image/") ? "PHOTO" : "DOCUMENT";

  await prisma.attachment.create({
    data: {
      organizationId: user.organizationId,
      projectId,
      uploadedByUserId: user.id,
      filename: file.name,
      storagePath: publicPath,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      kind,
    },
  });

  await logActivity({
    organizationId: user.organizationId,
    projectId,
    actorUserId: user.id,
    action: "attachment.uploaded",
    summary: `${user.name} uploaded ${file.name}`,
  });

  revalidatePath(`/projects/${projectId}/files`);
}

export async function deleteAttachment(attachmentId: string) {
  const user = await requireUser();
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, organizationId: user.organizationId },
  });
  if (!attachment) throw new Error("File not found");

  await prisma.attachment.delete({ where: { id: attachmentId } });
  if (attachment.projectId) {
    revalidatePath(`/projects/${attachment.projectId}/files`);
  }
}
