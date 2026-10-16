import "server-only";
import { currentUser } from "./auth";
import { database } from "./db";
import { verificationEnabled } from "./email";
import { sessionMfaValid,sessionIdForMfa } from "./mfa";
export type PlatformRole="super_admin"|"admin"|"support"|"analyst";
export async function platformRole(userId:string):Promise<PlatformRole|null> {
 const rows=await database()`SELECT role FROM platform_administrators WHERE user_id=${userId}::uuid LIMIT 1`;
 return rows.length?String(rows[0].role) as PlatformRole:null;
}
export async function verifiedAdmin(){
 const user=await currentUser();
 if(!user || (!user.verified && await verificationEnabled()))return null;
 const role=await platformRole(user.id);
 if(!role || !await sessionMfaValid(user.id))return null;
 return {user,role};
}
export async function requireSuperAdmin(){
 const admin=await verifiedAdmin();
 if(!admin||admin.role!=="super_admin")return null;
 return admin;
}
export async function platformSettings(){
 const rows=await database()`SELECT email_verification_enabled,email_provider,updated_at
 FROM platform_auth_settings WHERE singleton=true LIMIT 1`;
 return rows.length?{emailVerification:rows[0].email_verification_enabled===true,provider:String(rows[0].email_provider),updated:String(rows[0].updated_at)}
  :{emailVerification:false,provider:"resend",updated:""};
}

/** Only use for platform writes; the standard 12h session MFA is insufficient. */
export async function requireFreshSuperAdmin(){
 const admin=await requireSuperAdmin();if(!admin)return null;
 const session=await sessionIdForMfa(admin.user.id);if(!session)return null;
 const r=await database()`SELECT 1 FROM auth_sessions WHERE id=${session}::uuid AND user_id=${admin.user.id}::uuid AND revoked_at IS NULL AND expires_at>now() AND mfa_verified_at>now()-interval '10 minutes' LIMIT 1`;
 return r.length?admin:null;
}
