import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const STAFF_ROLES = ["volunteer", "core_committee", "super_admin"];
const PUBLIC_ROUTES = ["/", "/login", "/register", "/history"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & public files — never auth-gate these
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icon-") ||
    pathname.startsWith("/logo") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json")
  ) {
    return NextResponse.next();
  }

  // Public API endpoints that don't need user session
  const PUBLIC_API_ROUTES = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/cities",
    "/api/public/member",
  ];

  if (PUBLIC_API_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Public marketing + history + public Digital ID cards /u/MATANG-xxx
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/u/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized. Valid session token required." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Volunteers + committee + super admin can access admin tools
  if (pathname.startsWith("/admin") && !STAFF_ROLES.includes(session.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-role", session.role);
  if (session.cityId) requestHeaders.set("x-user-city", session.cityId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
