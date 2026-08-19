import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function ProjectActivityPage({
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

  const entries = await prisma.activityLog.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: { actor: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      {entries.length === 0 ? (
        <p className="text-slate-500 text-sm">No activity yet.</p>
      ) : (
        <ol className="bg-white border rounded-lg divide-y">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <p className="text-sm">{entry.summary}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
