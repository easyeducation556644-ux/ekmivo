"use server";
import { revalidatePath } from "next/cache";
import { database } from "../lib/server/db";
import { mailReady } from "../lib/server/email";
import { requireSuperAdmin, type PlatformRole } from "../lib/server/platform-admin";
import { asText, safeLocale } from "../lib/server/validation";

export type AdminActionState={status:"idle"|"error"|"success";message:string};
const emailLabels={
 en:{denied:"Super Admin permission required.",bad:"Invalid settings.",provider:"Connect Resend, a verified sender and an OTP secret before turning verification on.",saved:"Verification settings saved.",user:"Select a valid verified user.",self:"You cannot change your own platform role.",changed:"Platform role updated.",failed:"The operation failed. Try again."},
 bn:{denied:"শুধু Super Admin এই কাজ করতে পারবেন।",bad:"সেটিংস সঠিক নয়।",provider:"Verification চালুর আগে Resend, verified sender এবং OTP secret সেট করুন।",saved:"Verification সেটিংস সংরক্ষিত হয়েছে।",user:"যাচাইকৃত user নির্বাচন করুন।",self:"নিজের platform role পরিবর্তন করা যাবে না।",changed:"Platform role আপডেট হয়েছে।",failed:"কাজটি ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"}
} as const;

export async function setEmailVerificationAction(localeParam:string,_previous:AdminActionState,form:FormData):Promise<AdminActionState>{
 const locale=safeLocale(localeParam),t=emailLabels[locale];
 const admin=await requireSuperAdmin();
 if(!admin)return {status:"error",message:t.denied};
 const value=asText(form.get("enabled"));
 if(value!=="on"&&value!=="off")return {status:"error",message:t.bad};
 if(value==="on"&&!mailReady())return {status:"error",message:t.provider};
 try{
  await database().begin(async tx=>{
   await tx`UPDATE platform_auth_settings SET email_verification_enabled=${value==="on"},
   updated_at=now(),updated_by=${admin.user.id}::uuid WHERE singleton=true`;
   await tx`INSERT INTO platform_admin_audit(actor_id,action,description)
   VALUES (${admin.user.id}::uuid,'auth.verification_config',${"Email verification "+value})`;
  });
  revalidatePath(`/${locale}/admin`);
  return {status:"success",message:t.saved};
 }catch(e){console.error("[admin settings]",e instanceof Error?e.name:"unknown");return {status:"error",message:t.failed};}
}

export async function setPlatformRoleAction(localeParam:string,_previous:AdminActionState,form:FormData):Promise<AdminActionState>{
 const locale=safeLocale(localeParam),t=emailLabels[locale];
 const admin=await requireSuperAdmin();
 if(!admin)return {status:"error",message:t.denied};
 const id=asText(form.get("userId")),role=asText(form.get("role"));
 const validRoles=["super_admin","admin","support","analyst","remove"];
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)||!validRoles.includes(role))
  return {status:"error",message:t.user};
 if(id===admin.user.id)return {status:"error",message:t.self};
 try{
  const result=await database().begin(async tx=>{
   await tx`SELECT pg_advisory_xact_lock(5101482)`;
   const actor=await tx`SELECT role FROM platform_administrators WHERE user_id=${admin.user.id}::uuid FOR UPDATE`;
   if(!actor.length||actor[0].role!=="super_admin")return false;
   const target=await tx`SELECT id,email_verified_at,disabled_at FROM app_users WHERE id=${id}::uuid FOR UPDATE`;
   if(!target.length||!target[0].email_verified_at||target[0].disabled_at)return false;
   if(role==="remove"){
    await tx`DELETE FROM platform_administrators WHERE user_id=${id}::uuid`;
   }else{
    await tx`INSERT INTO platform_administrators (user_id,role,granted_by)
     VALUES (${id}::uuid,${role},${admin.user.id}::uuid)
     ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role,granted_by=EXCLUDED.granted_by`;
   }
   await tx`INSERT INTO platform_admin_audit(actor_id,action,subject_id,description)
    VALUES (${admin.user.id}::uuid,'admin.role_changed',${id}::uuid,${"Role changed to "+role})`;
   return true;
  });
  if(!result)return {status:"error",message:t.user};
  revalidatePath(`/${locale}/admin`);
  return {status:"success",message:t.changed};
 }catch(e){console.error("[admin role]",e instanceof Error?e.name:"unknown");return {status:"error",message:t.failed};}
}
