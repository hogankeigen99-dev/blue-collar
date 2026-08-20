"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type RequestResetState } from "@/lib/actions/password-reset";

const initialState: RequestResetState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {state.message ? (
          <p className="text-sm text-slate-700 bg-white border rounded-lg px-4 py-3 text-center">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4 bg-white border rounded-lg p-6">
            {state.error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {state.error}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
