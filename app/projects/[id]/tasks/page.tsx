import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createTask, deleteTask } from "@/lib/actions/tasks";
import { TaskStatusSelect } from "@/components/task-status-select";

export default async function ProjectTasksPage({
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

  const [tasks, orgUsers] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: id },
      orderBy: { position: "asc" },
      include: { assignee: true },
    }),
    prisma.user.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  async function addTask(formData: FormData) {
    "use server";
    await createTask(id, formData);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form action={addTask} className="bg-white border rounded-lg p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium mb-1">Task</label>
          <input name="title" required className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Assignee</label>
          <select name="assigneeUserId" className="border rounded-md px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {orgUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Due</label>
          <input type="date" name="dueDate" className="border rounded-md px-3 py-2 text-sm" />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="text-slate-500 text-sm">No tasks yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between px-4 py-3 gap-3">
              <div>
                <div className="font-medium">{task.title}</div>
                <div className="text-sm text-slate-500">
                  {task.assignee?.name ?? "Unassigned"}
                  {task.dueDate && ` · due ${new Date(task.dueDate).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TaskStatusSelect taskId={task.id} status={task.status} />
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
