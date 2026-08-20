import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const HEALTH_BADGE: Record<string, { label: string; className: string }> = {
  ON_TRACK: { label: "On track", className: "bg-green-50 text-green-700" },
  AT_RISK: { label: "At risk", className: "bg-red-50 text-red-700" },
};

const TABS = [
  { href: "", label: "Overview" },
  { href: "/tasks", label: "Tasks" },
  { href: "/team", label: "Team" },
  { href: "/schedule", label: "Schedule" },
  { href: "/files", label: "Files" },
  { href: "/activity", label: "Activity" },
];

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { customer: true },
  });

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-slate-500 hover:underline">
          ← Projects
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            {project.customer && (
              <p className="text-slate-500 text-sm mt-1">For {project.customer.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project.health === "AT_RISK" && (
              <span className={`text-xs px-2 py-1 rounded-full ${HEALTH_BADGE.AT_RISK.className}`}>
                {HEALTH_BADGE.AT_RISK.label}
              </span>
            )}
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              {STATUS_LABEL[project.status]}
            </span>
          </div>
        </div>
      </div>

      <div className="border-b flex gap-4 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/projects/${id}${tab.href}`}
            className="px-1 pb-2 text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
