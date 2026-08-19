import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrgActivityPage() {
  const user = await requireRole("ADMIN");

  const entries = await prisma.activityLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true, project: true },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Activity</h1>

      {entries.length === 0 ? (
        <p className="text-slate-500 text-sm">No activity yet.</p>
      ) : (
        <ol className="bg-white border rounded-lg divide-y">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <p className="text-sm">
                {entry.summary}
                {entry.project && (
                  <>
                    {" "}
                    ·{" "}
                    <Link href={`/projects/${entry.project.id}`} className="text-blue-600 hover:underline">
                      {entry.project.title}
                    </Link>
                  </>
                )}
              </p>
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
