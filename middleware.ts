import { NextResponse, type NextRequest } from "next/server";

// Cheap first gate: no session cookie means no access to app pages.
// The cookie itself is verified on the server by lib/session.ts.
export function middleware(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin"],
};
