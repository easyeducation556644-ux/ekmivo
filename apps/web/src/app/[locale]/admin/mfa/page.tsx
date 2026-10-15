import {notFound,redirect} from "next/navigation";
import {requireUser} from "../../../../lib/server/auth";
import {database} from "../../../../lib/server/db";
import {platformRole} from "../../../../lib/server/platform-admin";
import {mfaConfigured,sessionMfaValid} from "../../../../lib/server/mfa";
import {AdminMfaForm} from "../../../../components/admin-mfa-form";
export const dynamic="force-dynamic";
export default async function AdminMfaPage({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="bn"?"bn":"en";
 const user=await requireUser(locale);
 const role=await platformRole(user.id);
 if(!role)notFound();
 if(await sessionMfaValid(user.id))redirect("/"+locale+"/admin");
 const rows=await database()`SELECT confirmed_at FROM platform_admin_mfa WHERE user_id=${user.id}::uuid LIMIT 1`;
 return <main className="pa-mfa-screen"><AdminMfaForm locale={locale} ready={mfaConfigured()} enrolled={!!rows[0]?.confirmed_at}/></main>;
}
