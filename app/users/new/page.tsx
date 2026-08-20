import { requireCapability, assignableRoles } from "@/lib/auth";
import { NewUserForm } from "@/components/new-user-form";

export default async function NewUserPage() {
  const actor = await requireCapability("manage_users");

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Invite user</h1>
      <NewUserForm assignableRoles={assignableRoles(actor.role)} />
    </div>
  );
}
