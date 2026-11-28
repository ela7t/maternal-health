import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];
const PUBLIC_PREFIXES = ["/_next", "/api/cron/", "/api/webhook/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("mnh_session")?.value;
  if (!sessionCookie || !sessionCookie.includes(".")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
