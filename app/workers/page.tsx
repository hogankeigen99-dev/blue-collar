import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WorkersPage() {
  const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Workers</h1>
        <Link
          href="/workers/new"
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700"
        >
          + Add worker
        </Link>
      </div>

      {workers.length === 0 ? (
        <p className="text-slate-500 text-sm">No workers yet.</p>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {workers.map((w) => (
            <div key={w.id} className="px-4 py-3">
              <div className="font-medium">{w.name}</div>
              <div className="text-sm text-slate-500">
                {[w.role, w.phone, w.email].filter(Boolean).join(" · ") || "—"}
                {!w.active && " · inactive"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
