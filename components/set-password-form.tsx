"use client";

import { useActionState } from "react";
import { setPasswordWithToken, type SetPasswordState } from "@/lib/actions/password-reset";

const initialState: SetPasswordState = {};

export function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(setPasswordWithToken, initialState);

  return (
    <form action={formAction} className="space-y-4 bg-white border rounded-lg p-6">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">New password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        <p className="text-xs text-slate-400 mt-1">At least 8 characters</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Confirm password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Set password"}
      </button>
    </form>
  );
}
