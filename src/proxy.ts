import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/projects",
  "/inbox",
  "/team",
  "/himi",
  "/reports",
  "/settings",
  "/profile",
  "/more",
];

const AUTH_PAGES = ["/login", "/register"];

/**
 * Next.js 16 Request Proxy Boundary.
 * Provides pre-flight URL routing and early redirection checks.
 * Authoritative cryptographic authentication is enforced server-side.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const sessionCookie =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  // Early redirect for unauthenticated access to protected routes
  if (isProtected && !sessionCookie) {
    // Sanitize callback URL: ensure it is a safe relative path starting with /
    const safeTarget = pathname.startsWith("/") ? `${pathname}${search}` : "/dashboard";
    const callbackUrl = encodeURIComponent(safeTarget);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  // Early redirect to dashboard if authenticated user visits login/register
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
