import { SetPasswordForm } from "@/components/set-password-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Set your password</h1>
        </div>

        {token ? (
          <SetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-center">
            This link is missing a token. Check the URL or request a new link.
          </p>
        )}
      </div>
    </div>
  );
}
