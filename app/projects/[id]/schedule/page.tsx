import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createScheduleEntry, deleteScheduleEntry } from "@/lib/actions/schedule";

export default async function ProjectSchedulePage({
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

  const [entries, technicians] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: { projectId: id },
      orderBy: { startAt: "asc" },
      include: { technician: true },
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <form action={createScheduleEntry} className="bg-white border rounded-lg p-4 flex flex-wrap gap-2 items-end">
        <input type="hidden" name="projectId" value={id} />
        <div>
          <label className="block text-xs font-medium mb-1">Technician</label>
          <select name="userId" required className="border rounded-md px-2 py-2 text-sm">
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Start</label>
          <input type="datetime-local" name="startAt" required className="border rounded-md px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">End</label>
          <input type="datetime-local" name="endAt" required className="border rounded-md px-2 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Schedule
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="text-slate-500 text-sm">Nothing scheduled for this project.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium">{entry.technician.name}</div>
                <div className="text-sm text-slate-500">
                  {entry.startAt.toLocaleString()} – {entry.endAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {entry.notes && ` · ${entry.notes}`}
                </div>
              </div>
              <form action={deleteScheduleEntry.bind(null, entry.id)}>
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
