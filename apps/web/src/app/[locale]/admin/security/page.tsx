import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { verifiedAdmin } from "../../../../lib/server/platform-admin";
import { requireUser } from "../../../../lib/server/auth";
import { MfaSecurityControls, GoSessionStatus } from "../../../../components/mfa-security-controls";
export const dynamic="force-dynamic";
export default async function Security({params}:{params:Promise<{locale:string}>}) {
 const {locale:raw}=await params;if(raw!=="bn"&&raw!=="en")notFound();
 const locale=raw;
 await requireUser(locale);if(!await verifiedAdmin())redirect(`/${locale}/admin/mfa`);
 return <main className="ek-verification-screen"><div style={{width:"min(100%, 620px)",padding:20}}>
  <Link href={`/${locale}/admin`}>{locale==="bn"?"← অ্যাডমিনে ফিরুন":"← Back to administration"}</Link>
  <GoSessionStatus locale={locale}/><MfaSecurityControls locale={locale}/>
 </div></main>;
}
