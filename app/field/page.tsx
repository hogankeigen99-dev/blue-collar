import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TaskStatusSelect } from "@/components/task-status-select";

export const dynamic = "force-dynamic";

export default async function FieldViewPage() {
  const user = await requireUser();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [todaySchedule, myTasks] = await Promise.all([
    prisma.scheduleEntry.findMany({
      where: { userId: user.id, startAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { startAt: "asc" },
      include: { project: true },
    }),
    prisma.task.findMany({
      where: { assigneeUserId: user.id, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      include: { project: true },
    }),
  ]);

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">My field view</h1>
        <p className="text-slate-500 text-sm mt-1">Today&apos;s schedule and your open tasks.</p>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Today</h2>
        {todaySchedule.length === 0 ? (
          <p className="text-slate-500 text-sm">Nothing scheduled today.</p>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {todaySchedule.map((entry) => (
              <Link
                key={entry.id}
                href={`/projects/${entry.projectId}`}
                className="block px-4 py-3 hover:bg-slate-50"
              >
                <div className="font-medium">{entry.project.title}</div>
                <div className="text-sm text-slate-500">
                  {entry.startAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {"–"}
                  {entry.endAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {entry.project.address && ` · ${entry.project.address}`}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">My open tasks</h2>
        {myTasks.length === 0 ? (
          <p className="text-slate-500 text-sm">Nothing assigned to you.</p>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {myTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div>
                  <Link
                    href={`/projects/${task.projectId}`}
                    className="font-medium hover:underline"
                  >
                    {task.title}
                  </Link>
                  <div className="text-sm text-slate-500">
                    {task.project.title}
                    {task.dueDate && ` · due ${new Date(task.dueDate).toLocaleDateString()}`}
                  </div>
                </div>
                <TaskStatusSelect taskId={task.id} status={task.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
