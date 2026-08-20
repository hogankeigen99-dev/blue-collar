import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { updateLeadStatus } from "@/lib/actions/leads";
import { createEstimateFromLead } from "@/lib/actions/estimates";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const;

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { estimates: true },
  });
  if (!lead) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-slate-500 hover:underline">
          ← Leads
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{lead.name}</h1>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="text-sm text-slate-600 space-y-1">
          {lead.contactName && <div>Contact: {lead.contactName}</div>}
          {lead.phone && <div>Phone: {lead.phone}</div>}
          {lead.email && <div>Email: {lead.email}</div>}
          {lead.source && <div>Source: {lead.source}</div>}
        </div>
        {lead.notes && (
          <div>
            <div className="text-sm font-medium text-slate-500">Notes</div>
            <p className="text-sm">{lead.notes}</p>
          </div>
        )}

        <div>
          <div className="text-sm font-medium text-slate-500 mb-1">Status</div>
          <form action={updateLeadStatus.bind(null, lead.id)} className="flex items-center gap-2">
            <select name="status" defaultValue={lead.status} className="border rounded-md px-3 py-2 text-sm">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Estimates</h2>
          <form action={createEstimateFromLead.bind(null, lead.id)}>
            <button
              type="submit"
              className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700"
            >
              + Create estimate
            </button>
          </form>
        </div>
        {lead.estimates.length === 0 ? (
          <p className="text-slate-500 text-sm">No estimates yet.</p>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {lead.estimates.map((e) => (
              <Link
                key={e.id}
                href={`/estimates/${e.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <span className="text-sm font-medium">{e.title}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {e.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
