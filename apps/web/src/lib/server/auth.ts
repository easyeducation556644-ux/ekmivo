import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { database } from "./db";

function derive(password: string, salt: Buffer): Promise<Buffer> {
 return new Promise((resolve,reject)=>{
  scryptCallback(password,salt,64,{N:16384,r:8,p:1},(error,derived)=>{
   if(error)reject(error);else resolve(derived);
  });
 });
}
const COOKIE = "ekmivo-session";
const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
export type User = { id: string; email: string; name: string; verified: boolean };
export type Workspace = { id: string; name: string; mode: "ai"|"commerce"|"both"; role: "owner"|"admin"|"editor"|"viewer" };

export function hashToken(token: string) {
 return createHash("sha256").update(token).digest("hex");
}
export async function passwordHash(password: string) {
 const salt = randomBytes(24).toString("hex");
 const hash = await derive(password,Buffer.from(salt,"hex"));
 return `scrypt-v1:${salt}:${hash.toString("hex")}`;
}
export async function passwordMatches(password: string, stored: string) {
 const bits = stored.split(":");
 const salt = bits.length===3 && bits[0]==="scrypt-v1" && /^[a-f0-9]{48}$/.test(bits[1]) ? bits[1] : "0".repeat(48);
 const expected = bits.length===3 && /^[a-f0-9]{128}$/.test(bits[2]) ? Buffer.from(bits[2],"hex") : Buffer.alloc(64);
 const calculated = await derive(password,Buffer.from(salt,"hex"));
 return timingSafeEqual(calculated,expected) && salt!=="0".repeat(48);
}
export async function createSession(userId: string) {
 const token = randomBytes(32).toString("base64url");
 const expiresAt = new Date(Date.now()+THIRTY_DAYS);
 await database()`INSERT INTO auth_sessions (user_id,token_hash,expires_at) VALUES (${userId},${hashToken(token)},${expiresAt})`;
 (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt,priority:"high"});
}
export async function revokeSession() {
 const jar=await cookies();
 const token=jar.get(COOKIE)?.value;
 if(token && token.length<=256) await database()`UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=${hashToken(token)} AND revoked_at IS NULL`;
 jar.delete(COOKIE);
}
export async function currentUser():Promise<User|null> {
 const token=(await cookies()).get(COOKIE)?.value;
 if(!token || token.length>256) return null;
 const rows=await database()`
 SELECT u.id,u.email,u.display_name,u.email_verified_at
 FROM auth_sessions s JOIN app_users u ON u.id=s.user_id
 WHERE s.token_hash=${hashToken(token)} AND s.revoked_at IS NULL
 AND s.expires_at>now() AND u.disabled_at IS NULL LIMIT 1
 `;
 if(!rows.length)return null;
 const row=rows[0];
 return {id:String(row.id),email:String(row.email),name:String(row.display_name),verified:!!row.email_verified_at};
}
export async function requireUser(locale:"bn"|"en"):Promise<User> {
 const u=await currentUser();
 if(!u)redirect(`/${locale}/login`);
 return u;
}
export async function workspacesFor(userId:string):Promise<Workspace[]>{
 const rows=await database()`SELECT w.id,w.name,w.service_mode,m.role
 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id
 WHERE m.user_id=${userId} ORDER BY w.created_at DESC`;
 return rows.map(w=>({id:String(w.id),name:String(w.name),mode:w.service_mode as Workspace["mode"],role:w.role as Workspace["role"]}));
}
export async function requireWorkspace(locale:"bn"|"en",id:string){
 const user=await requireUser(locale);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))redirect(`/${locale}/workspaces`);
 const rows=await database()`
 SELECT w.id,w.name,w.service_mode,m.role FROM workspace_members m
 JOIN workspaces w ON w.id=m.workspace_id
 WHERE m.user_id=${user.id} AND w.id=${id}::uuid LIMIT 1`;
 if(!rows.length)redirect(`/${locale}/workspaces`);
 const w=rows[0];
 return {user,workspace:{id:String(w.id),name:String(w.name),mode:w.service_mode as Workspace["mode"],role:w.role as Workspace["role"]}};
}
export async function isPlatformAdmin(userId:string):Promise<boolean>{
 const rows=await database()`SELECT user_id FROM platform_administrators WHERE user_id=${userId}::uuid LIMIT 1`;
 return rows.length>0;
}
