"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/actions/tasks";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          updateTaskStatus(taskId, next);
        });
      }}
      className="border rounded-md px-2 py-1 text-xs disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
