import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/set-password"];
// Redirecting an already-signed-in visitor away only makes sense for
// login/signup — a signed-in user may still legitimately reset a password
// or accept an invite link for a different account.
const REDIRECT_IF_SIGNED_IN = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const redirectIfSignedIn = REDIRECT_IF_SIGNED_IN.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (redirectIfSignedIn && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
