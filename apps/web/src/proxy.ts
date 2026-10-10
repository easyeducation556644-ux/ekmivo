import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ekmivo-locale", request.nextUrl.pathname.startsWith("/en") ? "en" : "bn");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/", "/(en|bn)/:path*"] };
