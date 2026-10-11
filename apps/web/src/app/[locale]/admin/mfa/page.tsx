import { notFound,redirect } from "next/navigation";
import { requireUser } from "../../../../lib/server/auth";
import { platformRole } from "../../../../lib/server/platform-admin";
import { mfaConfigured,sessionMfaValid } from "../../../../lib/server/mfa";
import { AdminMfaForm } from "../../../../components/admin-mfa-form";
export const dynamic="force-dynamic";
export default async function AdminMfaPage({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="en"?"en":"bn";
 const user=await requireUser(locale);
 const role=await platformRole(user.id);
 if(!role)notFound();
 if(await sessionMfaValid(user.id))redirect(`/${locale}/admin`);
 return <main className="ek-verification-screen"><AdminMfaForm locale={locale} ready={mfaConfigured()}/></main>;
}
