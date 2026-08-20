import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  const user = await requireUser();
  const estimates = await prisma.estimate.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, lineItems: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Estimates</h1>
        <Link
          href="/estimates/new"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          + New estimate
        </Link>
      </div>

      {estimates.length === 0 ? (
        <p className="text-slate-500 text-sm">No estimates yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {estimates.map((e) => {
            const total = e.lineItems.reduce(
              (sum, li) => sum + Number(li.quantity) * Number(li.unitPrice),
              0
            );
            return (
              <Link
                key={e.id}
                href={`/estimates/${e.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-sm text-slate-500">
                    {e.customer?.name ?? "No customer"} · ${total.toFixed(2)}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                  {e.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
