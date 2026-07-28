import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Routes only a SUPER_ADMIN session may reach. /credentials is the internship
// credential manager; the engineer-facing key vault lives at /project-keys.
const SUPER_ADMIN_PREFIXES = ["/interns", "/credentials", "/team-access"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public read-only verification API — no session, no redirects.
  if (pathname.startsWith("/api/public/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isLogin = pathname === "/login";

  if (!session && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (
    session &&
    session.role !== "SUPER_ADMIN" &&
    SUPER_ADMIN_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return new NextResponse("403 Forbidden", {
      status: 403,
      headers: { "content-type": "text/plain" },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static files (anything with a dot).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
