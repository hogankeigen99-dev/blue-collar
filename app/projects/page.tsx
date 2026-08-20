import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, members: { include: { user: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link
          href="/projects/new"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          + New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-slate-500 text-sm">No projects yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <div className="font-medium">{project.title}</div>
                <div className="text-sm text-slate-500">
                  {project.customer?.name ?? "No customer"}
                  {project.members.length > 0 &&
                    ` · ${project.members.map((m) => m.user.name).join(", ")}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {project.health === "AT_RISK" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                    At risk
                  </span>
                )}
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {STATUS_LABEL[project.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
