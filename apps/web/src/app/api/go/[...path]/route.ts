import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
const workspacePath = /^workspaces\/[0-9a-f-]{36}\/(access|settings)$/i;
async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
 const path = (await context.params).path.join("/");
 const read = request.method === "GET";
 if (!(read && ["session", "platform/access"].includes(path)) && !workspacePath.test(path))
  return Response.json({ code: "NOT_FOUND" }, { status: 404 });
 if (!read && (!path.endsWith("/settings") || request.method !== "PATCH"))
  return Response.json({ code: "METHOD_NOT_ALLOWED" }, { status: 405 });
 const origin = new URL(request.url).origin;
 if (!read && request.headers.get("origin") !== origin)
  return Response.json({ code: "ORIGIN_DENIED" }, { status: 403 });
 const token = (await cookies()).get("ekmivo-session")?.value;
 if (!token) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
 const base = new URL(process.env.GO_API_URL || "https://ekmivo-go-api.onrender.com");
 if (base.protocol !== "https:" || base.username || base.password)
  return Response.json({ code: "PROXY_CONFIG_INVALID" }, { status: 503 });
 const target = new URL("/v1/" + path, base);
 const incoming = new URL(request.url);
 for (const key of ["environment", "capability"]) {
  const value = incoming.searchParams.get(key);
  if (value) target.searchParams.set(key, value);
 }
 const body = read ? undefined : await request.text();
 if (body && new TextEncoder().encode(body).length > 4096)
  return Response.json({ code: "BODY_TOO_LARGE" }, { status: 413 });
 try {
  const upstream = await fetch(target, {
   method: request.method, body, cache: "no-store", redirect: "error",
   headers: { Cookie: "ekmivo-session=" + token, "Content-Type": "application/json", Origin: origin },
   signal: AbortSignal.timeout(15000),
  });
  return new Response(await upstream.text(), { status: upstream.status,
   headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
 } catch { return Response.json({ code: "API_UNAVAILABLE" }, { status: 503 }); }
}
export const GET = forward;
export const PATCH = forward;
