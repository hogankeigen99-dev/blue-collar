import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { createProject } from "@/lib/actions/projects";

export default async function NewProjectPage() {
  const user = await requireRole("MANAGER");
  const customers = await prisma.customer.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">New project</h1>
      <form action={createProject} className="space-y-4 bg-white border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            name="title"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="e.g. Fix breaker panel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea name="description" rows={3} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Project address</label>
          <input name="address" className="w-full border rounded-md px-3 py-2 text-sm" />
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
          <label className="block text-sm font-medium mb-1">Scheduled at</label>
          <input type="datetime-local" name="scheduledAt" className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Create project
        </button>
      </form>
    </div>
  );
}
