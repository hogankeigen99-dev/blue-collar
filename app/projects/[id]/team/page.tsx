import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, ROLE_LABELS } from "@/lib/auth";
import { addProjectMember, removeProjectMember } from "@/lib/actions/project-members";

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!project) notFound();

  const [members, orgUsers] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: true },
      orderBy: { addedAt: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const memberIds = new Set(members.map((m) => m.userId));
  const available = orgUsers.filter((u) => !memberIds.has(u.id));

  async function addMember(formData: FormData) {
    "use server";
    await addProjectMember(id, formData);
  }

  return (
    <div className="max-w-xl space-y-6">
      {available.length > 0 && (
        <form action={addMember} className="bg-white border rounded-lg p-4 flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Add team member</label>
            <select name="userId" required className="w-full border rounded-md px-3 py-2 text-sm">
              {available.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABELS[u.role]})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Role</label>
            <select name="role" defaultValue="MEMBER" className="border rounded-md px-3 py-2 text-sm">
              <option value="MEMBER">Member</option>
              <option value="LEAD">Lead</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
          >
            Add
          </button>
        </form>
      )}

      {members.length === 0 ? (
        <p className="text-slate-500 text-sm">No team members assigned yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium">{m.user.name}</div>
                <div className="text-sm text-slate-500">
                  {ROLE_LABELS[m.user.role]} · <span className="uppercase text-xs">{m.role}</span> on this project
                </div>
              </div>
              <form action={removeProjectMember.bind(null, id, m.userId)}>
                <button type="submit" className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
