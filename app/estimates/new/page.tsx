import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createEstimate } from "@/lib/actions/estimates";

export default async function NewEstimatePage() {
  const user = await requireUser();
  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">New estimate</h1>
      <form action={createEstimate} className="space-y-4 bg-white border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input name="title" required className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <select name="customerId" className="w-full border rounded-md px-3 py-2 text-sm">
            <option value="">— None —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea name="notes" rows={3} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Create estimate
        </button>
      </form>
    </div>
  );
}
