"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/lib/actions/auth";

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Blue Collar</h1>
          <p className="text-slate-500 text-sm mt-1">Create your organization</p>
        </div>

        <form action={formAction} className="space-y-4 bg-white border rounded-lg p-6">
          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Company / organization name</label>
            <input
              name="orgName"
              required
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g. Riverside Home Services"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your name</label>
            <input name="name" required className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">At least 8 characters</p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create organization"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
