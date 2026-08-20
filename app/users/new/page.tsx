import { requireRole, ROLE_ORDER } from "@/lib/auth";
import { NewUserForm } from "@/components/new-user-form";

export default async function NewUserPage() {
  const actor = await requireRole("ADMIN");
  const assignableRoles = ROLE_ORDER.filter(
    (r) => ROLE_ORDER.indexOf(r) <= ROLE_ORDER.indexOf(actor.role)
  );

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Invite user</h1>
      <NewUserForm assignableRoles={assignableRoles} />
    </div>
  );
}
