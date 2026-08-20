import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability, ROLE_LABELS } from "@/lib/auth";
import { setUserActive } from "@/lib/actions/users";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await requireCapability("manage_users");
  const users = await prisma.user.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link
          href="/users/new"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          + Add user
        </Link>
      </div>

      <div className="bg-white border rounded-lg divide-y">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">
                {u.name}{" "}
                {!u.active && (
                  <span className="text-xs text-slate-400 font-normal">(inactive)</span>
                )}
              </div>
              <div className="text-sm text-slate-500">
                {u.email} · <span className="text-xs">{ROLE_LABELS[u.role]}</span>
              </div>
            </div>
            {u.id !== actor.id && (
              <form action={setUserActive.bind(null, u.id, !u.active)}>
                <button type="submit" className="text-sm text-slate-600 hover:underline">
                  {u.active ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
