import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth";

export function proxy(request) {
  const hasSession = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/change-password"] };
