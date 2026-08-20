"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "@/lib/actions/users";
import type { Role } from "@prisma/client";

const initialState: CreateUserState = {};

export function NewUserForm({ assignableRoles }: { assignableRoles: Role[] }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  if (state.inviteLink) {
    return (
      <div className="space-y-4 bg-white border rounded-lg p-6">
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          User created. Email delivery isn&apos;t configured, so share this invite link with them
          directly — it expires in 7 days:
        </p>
        <code className="block text-xs bg-slate-50 border rounded-md px-3 py-2 break-all">
          {state.inviteLink}
        </code>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 bg-white border rounded-lg p-6">
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input name="name" required className="w-full border rounded-md px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <input
          name="email"
          type="email"
          required
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        <p className="text-xs text-slate-400 mt-1">
          They&apos;ll get an email invite to set their own password.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <select name="role" defaultValue="TECHNICIAN" className="w-full border rounded-md px-3 py-2 text-sm">
          {assignableRoles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Sending invite..." : "Invite user"}
      </button>
    </form>
  );
}
