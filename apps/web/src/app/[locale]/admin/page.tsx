import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isPlatformAdmin } from "../../../lib/server/auth";
import { logoutAction } from "../../../actions/account";
export const dynamic="force-dynamic";
const adminFeatures={
 en:[["Merchants & workspaces","Workspace ownership, status and operational requests"],["Transactions & disputes","Payment exceptions, reconciliation and disputes"],["Providers & gateways","Provider permissions, adapters and health"],["Receipt devices","Android bridges, ingestion and deduplication"],["Staff & security","Administrator assignments and audit history"],["Webhooks & jobs","Retries, deliveries, queue health and incident review"],["Usage & billing","Subscriptions, credits and platform accounting"],["Platform health","Latency, errors, backups and recovery"]],
 bn:[["মার্চেন্ট ও ওয়ার্কস্পেস","মার্চেন্ট, ওয়ার্কস্পেস ও অ্যাক্সেস"],["লেনদেন ও সমস্যা","পেমেন্ট ব্যতিক্রম, হিসাব ও dispute"],["গেটওয়ে ও প্রদানকারী","অনুমতি, adapter ও connection health"],["রসিদ ডিভাইস","Android bridge, SMS ও duplicate যাচাই"],["স্টাফ ও নিরাপত্তা","অ্যাডমিন, audit log ও অধিকার"],["Webhook ও কাজ","Retry, delivery ও queue status"],["ব্যবহার ও বিলিং","সাবস্ক্রিপশন, credit ও হিসাব"],["সিস্টেমের অবস্থা","Latency, error, backup ও recovery"]]
};
export default async function PlatformAdmin({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="en"?"en":"bn";
 const user=await requireUser(locale);
 if(!user.verified || !await isPlatformAdmin(user.id))notFound();
 return <main className="ek-app-shell ek-admin">
  <header className="ek-app-topbar"><Link href={`/${locale}`} className="ek-wordmark">ekmivo.</Link><div><span>PLATFORM ADMIN</span><span className="ek-avatar">{user.name[0].toUpperCase()}</span></div></header>
  <div className="ek-page-wrap"><div className="ek-page-kicker">EKMIVO / ADMINISTRATION · RESTRICTED</div><h1>{locale==="bn"?"প্ল্যাটফর্ম কন্ট্রোল সেন্টার":"Platform control center"}</h1><p className="ek-lead">{locale==="bn"?"শুধুমাত্র database-authorized platform admin-দের জন্য। লাইভ পরিচালনার data services এখনো যুক্ত হয়নি।":"Restricted to explicitly provisioned platform administrators. Operational data sources are not connected yet."}</p>
   <div className="ek-kpi-grid">{["MERCHANTS","TRANSACTIONS","DEVICE HEALTH","JOB QUEUE"].map(k=><article className="ek-kpi-card" key={k}><span>{k}</span><strong>—</strong><small>{locale==="bn"?"তথ্য সংযুক্ত হয়নি":"Not connected"}</small></article>)}</div>
   <div className="ek-admin-grid">{adminFeatures[locale].map(([title,detail],i)=><article className="ek-admin-module" key={title}><span>{String(i+1).padStart(2,"0")} / MODULE</span><h2>{title}</h2><p>{detail}</p><small>{locale==="bn"?"ডেটা ইন্টিগ্রেশন অপেক্ষমাণ":"Data integration pending"}</small></article>)}</div>
   <div className="ek-admin-actions"><Link href={`/${locale}/workspaces`}>← {locale==="bn"?"ওয়ার্কস্পেসে ফিরুন":"Back to workspaces"}</Link><form action={logoutAction.bind(null,locale)}><button type="submit">{locale==="bn"?"লগ আউট":"Sign out"}</button></form></div>
  </div>
 </main>;
}
