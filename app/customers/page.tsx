import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser();
  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link
          href="/customers/new"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          + Add customer
        </Link>
      </div>

      {customers.length === 0 ? (
        <p className="text-slate-500 text-sm">No customers yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {customers.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-slate-500">
                {[c.address, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
