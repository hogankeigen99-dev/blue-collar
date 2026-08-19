import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { uploadAttachment, deleteAttachment } from "@/lib/actions/attachments";

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) notFound();

  const attachments = await prisma.attachment.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: true },
  });

  async function upload(formData: FormData) {
    "use server";
    await uploadAttachment(id, formData);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form action={upload} className="bg-white border rounded-lg p-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1">Upload photo or document</label>
          <input type="file" name="file" required className="w-full text-sm" />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Upload
        </button>
      </form>

      {attachments.length === 0 ? (
        <p className="text-slate-500 text-sm">No files yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachments.map((a) => (
            <div key={a.id} className="bg-white border rounded-lg p-3 space-y-2">
              {a.kind === "PHOTO" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.storagePath}
                  alt={a.filename}
                  className="w-full h-32 object-cover rounded-md"
                />
              ) : (
                <a
                  href={a.storagePath}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center h-32 rounded-md bg-slate-50 text-slate-400 text-xs"
                >
                  Document
                </a>
              )}
              <div className="text-xs truncate" title={a.filename}>
                {a.filename}
              </div>
              <div className="text-xs text-slate-400">{a.uploadedBy?.name ?? "Unknown"}</div>
              <form action={deleteAttachment.bind(null, a.id)}>
                <button type="submit" className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
