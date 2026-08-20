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

export default async function DashboardPage() {
  const user = await requireUser();
  const orgId = user.organizationId;

  const [projects, userCount, customerCount, openLeads, counts] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      orderBy: { scheduledAt: "asc" },
      include: { customer: true, members: { include: { user: true } } },
      take: 10,
    }),
    prisma.user.count({ where: { organizationId: orgId, active: true } }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.lead.count({
      where: { organizationId: orgId, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
    }),
    prisma.project.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    }),
  ]);

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Overview of projects, crew, and customers.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(STATUS_LABEL).map(([status, label]) => (
          <div key={status} className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-semibold">{countByStatus[status] ?? 0}</div>
            <div className="text-sm text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-sm text-slate-600">
        <span>{userCount} active users</span>
        <span>&middot;</span>
        <span>{customerCount} customers</span>
        <span>&middot;</span>
        <Link href="/leads" className="hover:underline">
          {openLeads} open leads
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Upcoming / recent projects</h2>
          <Link href="/projects/new" className="text-sm text-blue-600 hover:underline">
            + New project
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No projects yet.{" "}
            <Link href="/projects/new" className="text-blue-600 hover:underline">
              Create the first one
            </Link>
            .
          </p>
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
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {STATUS_LABEL[project.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
