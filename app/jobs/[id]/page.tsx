import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateJobStatus, deleteJob } from "@/lib/actions";

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { customer: true, assignments: { include: { worker: true } } },
  });

  if (!job) notFound();

  async function setStatus(formData: FormData) {
    "use server";
    const status = formData.get("status");
    if (typeof status === "string") {
      await updateJobStatus(job!.id, status);
    }
  }

  async function removeJob() {
    "use server";
    await deleteJob(job!.id);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        {job.customer && (
          <p className="text-slate-500 text-sm mt-1">For {job.customer.name}</p>
        )}
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        {job.description && (
          <div>
            <div className="text-sm font-medium text-slate-500">Description</div>
            <p className="text-sm">{job.description}</p>
          </div>
        )}
        {job.address && (
          <div>
            <div className="text-sm font-medium text-slate-500">Address</div>
            <p className="text-sm">{job.address}</p>
          </div>
        )}
        {job.scheduledAt && (
          <div>
            <div className="text-sm font-medium text-slate-500">Scheduled</div>
            <p className="text-sm">{new Date(job.scheduledAt).toLocaleString()}</p>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-slate-500">Assigned workers</div>
          {job.assignments.length === 0 ? (
            <p className="text-sm text-slate-500">None assigned</p>
          ) : (
            <ul className="text-sm list-disc list-inside">
              {job.assignments.map((a) => (
                <li key={a.id}>
                  {a.worker.name} {a.worker.role && `(${a.worker.role})`}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-slate-500 mb-1">Status</div>
          <form action={setStatus} className="flex items-center gap-2">
            <select
              name="status"
              defaultValue={job.status}
              className="border rounded-md px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-slate-900 text-white text-sm px-3 py-2 rounded-md hover:bg-slate-700"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      <form action={removeJob}>
        <button
          type="submit"
          className="text-sm text-red-600 hover:underline"
        >
          Delete job
        </button>
      </form>
    </div>
  );
}
