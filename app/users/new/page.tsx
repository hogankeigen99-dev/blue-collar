import { requireRole, ROLE_ORDER } from "@/lib/auth";
import { createUser } from "@/lib/actions/users";

export default async function NewUserPage() {
  const actor = await requireRole("ADMIN");
  const assignableRoles = ROLE_ORDER.filter(
    (r) => ROLE_ORDER.indexOf(r) <= ROLE_ORDER.indexOf(actor.role)
  );

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Add user</h1>
      <form action={createUser} className="space-y-4 bg-white border rounded-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input name="name" required className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            name="email"
            type="email"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Initial password *</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">
            Share this with them directly — there is no email invite flow yet.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select name="role" defaultValue="TECHNICIAN" className="w-full border rounded-md px-3 py-2 text-sm">
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Add user
        </button>
      </form>
    </div>
  );
}
