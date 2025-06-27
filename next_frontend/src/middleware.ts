import { NextResponse, type NextRequest } from "next/server";

const lockIsOn = process.env.NODE_ENV != "development";

export function middleware(req: NextRequest) {
  if (!lockIsOn) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Info: It Allows wait-list, static assets and Next internals through
  if (
    pathname.startsWith("/join-waitlist") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/join-waitlist";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/:path*",
};
