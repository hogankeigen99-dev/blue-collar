import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser, hasCapability, ROLE_LABELS } from "@/lib/auth";
import { logOut } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Blue Collar — Field Service Platform",
  description: "Manage projects, crews, customers, and leads.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          {user && (
            <header className="border-b bg-white">
              <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
                <Link href="/" className="font-semibold text-lg">
                  Blue Collar
                </Link>
                <Link href="/projects" className="text-sm text-slate-600 hover:text-slate-900">
                  Projects
                </Link>
                <Link href="/schedule" className="text-sm text-slate-600 hover:text-slate-900">
                  Schedule
                </Link>
                <Link href="/leads" className="text-sm text-slate-600 hover:text-slate-900">
                  Leads
                </Link>
                <Link href="/estimates" className="text-sm text-slate-600 hover:text-slate-900">
                  Estimates
                </Link>
                <Link href="/customers" className="text-sm text-slate-600 hover:text-slate-900">
                  Customers
                </Link>
                {user.role === "FIELD_TECH" && (
                  <Link href="/field" className="text-sm text-slate-600 hover:text-slate-900">
                    My Field View
                  </Link>
                )}
                {hasCapability(user.role, "manage_users") && (
                  <Link href="/users" className="text-sm text-slate-600 hover:text-slate-900">
                    Users
                  </Link>
                )}
                {hasCapability(user.role, "view_org_activity") && (
                  <Link href="/activity" className="text-sm text-slate-600 hover:text-slate-900">
                    Activity
                  </Link>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {user.name} · <span className="text-xs">{ROLE_LABELS[user.role]}</span>
                  </span>
                  <form action={logOut}>
                    <button type="submit" className="text-sm text-slate-600 hover:text-slate-900">
                      Sign out
                    </button>
                  </form>
                </div>
              </nav>
            </header>
          )}
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
