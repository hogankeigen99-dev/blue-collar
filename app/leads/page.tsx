import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const;

export default async function LeadsPage() {
  const user = await requireUser();
  const leads = await prisma.lead.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, leads.filter((l) => l.status === s)]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Link
          href="/leads/new"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          + New lead
        </Link>
      </div>

      <div className="grid sm:grid-cols-5 gap-4">
        {STATUSES.map((status) => (
          <div key={status} className="space-y-2">
            <h2 className="text-xs font-medium text-slate-500 uppercase">
              {status} ({byStatus[status].length})
            </h2>
            <div className="space-y-2">
              {byStatus[status].map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="block bg-white border rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <div className="text-sm font-medium">{lead.name}</div>
                  {lead.contactName && (
                    <div className="text-xs text-slate-500">{lead.contactName}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
