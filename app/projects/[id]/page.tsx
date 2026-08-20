import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { updateProjectStatus, deleteProject } from "@/lib/actions/projects";

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: true,
      createdBy: true,
      _count: { select: { tasks: true, members: true, attachments: true } },
    },
  });

  if (!project) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border rounded-lg p-6 space-y-4">
        {project.description && (
          <div>
            <div className="text-sm font-medium text-slate-500">Description</div>
            <p className="text-sm">{project.description}</p>
          </div>
        )}
        {project.address && (
          <div>
            <div className="text-sm font-medium text-slate-500">Address</div>
            <p className="text-sm">{project.address}</p>
          </div>
        )}
        {project.scheduledAt && (
          <div>
            <div className="text-sm font-medium text-slate-500">Scheduled</div>
            <p className="text-sm">{new Date(project.scheduledAt).toLocaleString()}</p>
          </div>
        )}
        <div className="flex gap-6 text-sm text-slate-500">
          <span>{project._count.tasks} tasks</span>
          <span>{project._count.members} team members</span>
          <span>{project._count.attachments} files</span>
        </div>
        {project.createdBy && (
          <div className="text-xs text-slate-400">Created by {project.createdBy.name}</div>
        )}

        <div>
          <div className="text-sm font-medium text-slate-500 mb-1">Status</div>
          <form action={updateProjectStatus.bind(null, project.id)} className="flex items-center gap-2">
            <select name="status" defaultValue={project.status} className="border rounded-md px-3 py-2 text-sm">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-900 text-white text-sm px-3 py-2 rounded-md hover:bg-slate-700"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      <form action={deleteProject.bind(null, project.id)}>
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Delete project
        </button>
      </form>
    </div>
  );
}
