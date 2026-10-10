import Link from "next/link";
import { AppShell } from "./app-shell";
import { type User, type Workspace } from "../lib/server/auth";
import { sections, type SectionKey, allowedSection } from "../lib/dashboard-sections";
type Locale="bn"|"en";
export function EmptyState({locale,title,description}:{locale:Locale;title:string;description:string}){
 return <div className="ek-empty"><div className="ek-empty-icon" aria-hidden="true">◫</div><h2>{title}</h2><p>{description}</p><small>{locale==="bn"?"লাইভ ডেটা সংযুক্ত হলে এখানে দেখা যাবে। নমুনা লেনদেন দেখানো হচ্ছে না।":"Connect real integrations to populate this view. No simulated financial data is shown."}</small></div>;
}
export async function DashboardContent({locale,user,workspace,section}:{locale:Locale;user:User;workspace:Workspace;section:SectionKey}){
 const detail=sections[section];
 const base=`/${locale}/w/${workspace.id}`;
 return <AppShell locale={locale} user={user} workspace={workspace} section={section}>
  <div className="ek-content">
   <div className="ek-content-heading"><div><p className="ek-page-kicker">WORKSPACE / {workspace.mode.toUpperCase()} · {workspace.role.toUpperCase()}</p><h1>{detail[locale]}</h1><p>{detail.detail[locale]}</p></div></div>
   {section==="overview"?<>
    {!user.verified&&<div className="ek-notice" role="status">{locale==="bn"?"ইমেইল verification এখনো সেটআপ হয়নি। Provider credentials যোগ হলে account verification চালু করতে হবে; live payment processing নিষ্ক্রিয় রাখুন।":"Email verification is not configured yet. Connect an email provider before enabling live payment processing."}</div>}
    <div className="ek-kpi-grid">
     {[
      {en:"Conversations",bn:"কথোপকথন"},
      {en:"Orders",bn:"অর্ডার"},
      {en:"Payment requests",bn:"পেমেন্ট রিকোয়েস্ট"},
      {en:"Needs attention",bn:"দেখা প্রয়োজন"}
     ].map(item=><article className="ek-kpi-card" key={item.en}><span>{item[locale]}</span><strong>—</strong><small>{locale==="bn"?"তথ্য এখনো নেই":"No data yet"}</small></article>)}
    </div>
    <div className="ek-panel"><div className="ek-panel-head"><h2>{locale==="bn"?"শুরু করার ধাপ":"Getting started"}</h2><span>01 / SETUP</span></div>
     <div className="ek-next-grid">
      {(["inbox","payments","settings","team"] as SectionKey[]).filter(k=>allowedSection(k,workspace.mode)).map((k,i)=><Link key={k} href={`${base}/${k}`}><span>{String(i+1).padStart(2,"0")}</span><strong>{sections[k][locale]}</strong><small>{sections[k].detail[locale]}</small><span className="ek-next-arrow">↗</span></Link>)}
     </div>
    </div>
    <EmptyState locale={locale} title={locale==="bn"?"সাম্প্রতিক কার্যক্রম নেই":"No recent activity"} description={locale==="bn"?"বাস্তব সেবা সংযুক্ত হলে কার্যক্রম, মেসেজ, অর্ডার ও পেমেন্ট এখানে আসবে।":"Your real conversations, orders and payments will appear after services are connected."}/>
   </>:<EmptyState locale={locale} title={detail[locale]} description={detail.detail[locale]}/>}
  </div>
 </AppShell>;
}
