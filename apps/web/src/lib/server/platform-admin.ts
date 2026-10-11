import "server-only";
import { currentUser } from "./auth";
import { database } from "./db";
export type PlatformRole="super_admin"|"admin"|"support"|"analyst";
export async function platformRole(userId:string):Promise<PlatformRole|null> {
 const rows=await database()`SELECT role FROM platform_administrators WHERE user_id=${userId}::uuid LIMIT 1`;
 return rows.length?String(rows[0].role) as PlatformRole:null;
}
export async function verifiedAdmin(){
 const user=await currentUser();
 if(!user||!user.verified)return null;
 const role=await platformRole(user.id);
 return role?{user,role}:null;
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
