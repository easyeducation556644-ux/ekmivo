import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
 const path=request.nextUrl.pathname;
 const requestHeaders=new Headers(request.headers);
 requestHeaders.set("x-ekmivo-locale",path.startsWith("/en")?"en":"bn");
 const application=/^\/(?:en|bn)\/(?:workspaces|w|admin|account|verify-email|pay|checkout)(?:\/|$)/.test(path);
 requestHeaders.set("x-ekmivo-application",application?"1":"0");
 const response=NextResponse.next({request:{headers:requestHeaders}});
 if(application)response.headers.set("Cache-Control","private, no-store");
 return response;
}
export const config={matcher:["/","/(en|bn)/:path*"]};
