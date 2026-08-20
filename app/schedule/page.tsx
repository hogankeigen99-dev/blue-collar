import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createScheduleEntry, deleteScheduleEntry } from "@/lib/actions/schedule";

export const dynamic = "force-dynamic";

function dateKey(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default async function SchedulePage() {
  const user = await requireUser();
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const [entries, projects, technicians] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: { organizationId: user.organizationId, startAt: { gte: since } },
      orderBy: { startAt: "asc" },
      include: { project: true, technician: true },
    }),
    prisma.project.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { title: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = dateKey(entry.startAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(entry);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Schedule</h1>
      </div>

      <form
        action={createScheduleEntry}
        className="bg-white border rounded-lg p-4 grid grid-cols-2 sm:grid-cols-5 gap-2 items-end"
      >
        <div>
          <label className="block text-xs font-medium mb-1">Project</label>
          <select name="projectId" required className="w-full border rounded-md px-2 py-2 text-sm">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Technician</label>
          <select name="userId" required className="w-full border rounded-md px-2 py-2 text-sm">
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Start</label>
          <input type="datetime-local" name="startAt" required className="w-full border rounded-md px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">End</label>
          <input type="datetime-local" name="endAt" required className="w-full border rounded-md px-2 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Schedule
        </button>
      </form>

      {grouped.size === 0 ? (
        <p className="text-slate-500 text-sm">Nothing scheduled.</p>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([day, dayEntries]) => (
            <div key={day}>
              <h2 className="text-sm font-medium text-slate-500 mb-2">{day}</h2>
              <div className="bg-white border rounded-lg divide-y">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="font-medium">{entry.project.title}</div>
                      <div className="text-sm text-slate-500">
                        {entry.technician.name} ·{" "}
                        {entry.startAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        {"–"}
                        {entry.endAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
