import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "../../../lib/server/auth";
import { verifiedAdmin, platformSettings } from "../../../lib/server/platform-admin";
import { mailReady } from "../../../lib/server/email";
import { database } from "../../../lib/server/db";
import { VerificationSettings, RoleControls } from "../../../components/admin-controls";
import { logoutAction } from "../../../actions/account";
export const dynamic="force-dynamic";

const adminFeatures={
 en:[["Merchants & workspaces","Workspace ownership and operational requests"],["Transactions & disputes","Payment exceptions and reconciliation"],["Providers & gateways","Provider credentials and health"],["Receipt devices","Android bridge events and receipt status"],["Staff & security","Platform roles and audit history"],["Webhooks & jobs","Delivery, retry and queue health"],["Usage & billing","Subscriptions, usage and billing"],["Platform health","Availability, latency and incidents"]],
 bn:[["মার্চেন্ট ও ওয়ার্কস্পেস","মার্চেন্ট, ওয়ার্কস্পেস ও অনুরোধ"],["লেনদেন ও সমস্যা","পেমেন্ট যাচাই ও ব্যতিক্রম"],["গেটওয়ে ও প্রদানকারী","অনুমতি ও সার্ভিসের অবস্থা"],["রসিদ ডিভাইস","Android bridge ও SMS তথ্য"],["স্টাফ ও নিরাপত্তা","রোল, অনুমতি ও অডিট লগ"],["Webhook ও কাজ","Retry ও queue status"],["ব্যবহার ও বিলিং","সাবস্ক্রিপশন ও ব্যবহার"],["সিস্টেমের অবস্থা","Latency, error ও recovery"]]
};
export default async function PlatformAdmin({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="en"?"en":"bn";
 const user=await requireUser(locale);
 const admin=await verifiedAdmin();
 if(!admin || admin.user.id!==user.id)notFound();
 const isSuper=admin.role==="super_admin";
 const [settings,counts,users,audit]=await Promise.all([
  platformSettings(),
  database()`SELECT (SELECT count(*) FROM app_users)::int AS users,
   (SELECT count(*) FROM workspaces)::int AS workspaces,
   (SELECT count(*) FROM platform_administrators)::int AS administrators`,
  isSuper?database()`SELECT u.id,u.display_name,u.email,u.email_verified_at,p.role
   FROM app_users u LEFT JOIN platform_administrators p ON p.user_id=u.id
   ORDER BY u.created_at DESC LIMIT 80`:Promise.resolve([]),
  isSuper?database()`SELECT action,description,occurred_at FROM platform_admin_audit
   ORDER BY occurred_at DESC LIMIT 12`:Promise.resolve([])
 ]);
 const roleUsers=users.map(u=>({id:String(u.id),name:String(u.display_name),email:String(u.email),verified:!!u.email_verified_at,role:u.role?String(u.role):null}));
 const cards=[
  {title:locale==="bn"?"ব্যবহারকারী":"Users",value:counts[0]?.users??0},
  {title:locale==="bn"?"ওয়ার্কস্পেস":"Workspaces",value:counts[0]?.workspaces??0},
  {title:locale==="bn"?"প্ল্যাটফর্ম অ্যাডমিন":"Administrators",value:counts[0]?.administrators??0},
  {title:locale==="bn"?"পেমেন্ট কার্যক্রম":"Payment operations",value:"—"}
 ];
 return <main className="ek-app-shell ek-admin">
  <header className="ek-app-topbar"><Link href={"/"+locale} className="ek-wordmark">ekmivo.</Link><div><span>PLATFORM ADMIN / {admin.role.toUpperCase()}</span><span className="ek-avatar">{user.name[0].toUpperCase()}</span></div></header>
  <div className="ek-page-wrap">
   <div className="ek-page-kicker">EKMIVO / AUTHORIZED ADMINISTRATION</div>
   <h1>{locale==="bn"?"প্ল্যাটফর্ম কন্ট্রোল সেন্টার":"Platform control center"}</h1>
   <p className="ek-lead">{locale==="bn"?"সরাসরি ডাটাবেস-সংযুক্ত অ্যাডমিন প্যানেল। Provider integration এখনো চালু হয়নি।":"Real database-backed administration. Payment provider operations are not connected yet."}</p>
   <div className="ek-kpi-grid">{cards.map(item=><article className="ek-kpi-card" key={item.title}><span>{item.title}</span><strong>{item.value}</strong><small>{item.value==="—"?(locale==="bn"?"সংযুক্ত হয়নি":"Not connected"):(locale==="bn"?"লাইভ ডাটাবেস":"Live database")}</small></article>)}</div>
   <div className="ek-admin-grid">{adminFeatures[locale].map(([title,detail],i)=><article className="ek-admin-module" key={title}><span>{String(i+1).padStart(2,"0")} / MODULE</span><h2>{title}</h2><p>{detail}</p><small>{locale==="bn"?"পরবর্তী ইন্টিগ্রেশন":"Integration pending"}</small></article>)}</div>
   {isSuper&&<section className="ek-admin-management">
    <p className="ek-page-kicker">AUTHORIZATION / SECURITY</p>
    <h2>{locale==="bn"?"ব্যবস্থাপনা ও নিরাপত্তা":"Administration & security"}</h2>
    <VerificationSettings locale={locale} enabled={settings.emailVerification} providerReady={mailReady()}/>
    <RoleControls locale={locale} users={roleUsers}/>
    <div className="ek-panel ek-settings-panel">
     <div className="ek-panel-head"><h2>{locale==="bn"?"সাম্প্রতিক পরিবর্তন":"Recent administrative changes"}</h2><span>AUDIT LOG</span></div>
     {audit.length===0?<p>{locale==="bn"?"এখনো কোনো পরিবর্তন হয়নি।":"No changes yet."}</p>:<ul className="ek-audit-list">{audit.map((entry,i)=><li key={i}><strong>{String(entry.action)}</strong><span>{String(entry.description)}</span><small>{new Date(entry.occurred_at).toLocaleString(locale==="bn"?"bn-BD":"en-US")}</small></li>)}</ul>}
    </div>
   </section>}
   <div className="ek-admin-actions"><Link href={"/"+locale+"/workspaces"}>← {locale==="bn"?"ওয়ার্কস্পেসে ফিরুন":"Back to workspaces"}</Link><form action={logoutAction.bind(null,locale)}><button type="submit">{locale==="bn"?"লগ আউট":"Sign out"}</button></form></div>
  </div>
 </main>;
}
