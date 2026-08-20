"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uploadObject, deleteObject } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// Extension allowlist keyed by MIME type — deliberately excludes svg/html/js
// and any other type a browser might execute or render as markup if it were
// ever served back with the wrong Content-Type.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

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
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File must be 10MB or smaller");
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error(
      "Unsupported file type. Allowed: images (jpg, png, gif, webp, heic), PDF, Word, Excel, txt, csv."
    );
  }

  const key = `${user.organizationId}/${projectId}/${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(key, buffer, file.type);

  const kind = file.type.startsWith("image/") ? "PHOTO" : "DOCUMENT";

  await prisma.attachment.create({
    data: {
      organizationId: user.organizationId,
      projectId,
      uploadedByUserId: user.id,
      filename: file.name.slice(0, 255),
      storagePath: key,
      contentType: file.type,
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

  await deleteObject(attachment.storagePath);
  await prisma.attachment.delete({ where: { id: attachmentId } });
  if (attachment.projectId) {
    revalidatePath(`/projects/${attachment.projectId}/files`);
  }
}
