import Link from "next/link";
import { logoutAction } from "../actions/account";
import { type User, type Workspace, workspacesFor, isPlatformAdmin } from "../lib/server/auth";
import { sections,groupOrder,allowedSection,type SectionKey } from "../lib/dashboard-sections";
type Locale="bn"|"en";
const groupNames={en:{common:"Workspace",ai:"AI Communication",commerce:"Commerce & Payments"},bn:{common:"ওয়ার্কস্পেস",ai:"AI যোগাযোগ",commerce:"কমার্স ও পেমেন্ট"}} as const;
export async function AppShell({locale,user,workspace,section,children}:{locale:Locale;user:User;workspace:Workspace;section:SectionKey;children:React.ReactNode}){
 const spaces=await workspacesFor(user.id);
 const platformAdmin=user.verified&&await isPlatformAdmin(user.id);
 const base=`/${locale}/w/${workspace.id}`;
 return <main className="ek-dashboard">
  <aside className="ek-sidebar">
   <Link href={`/${locale}`} className="ek-wordmark">ekmivo<span>.</span></Link>
   <details className="ek-workspace-switch"><summary><span className="ek-avatar">{workspace.name.slice(0,1).toUpperCase()}</span><span><strong>{workspace.name}</strong><small>{workspace.mode==="both"?"AI + Commerce":workspace.mode==="ai"?"AI Communication":"Commerce & Payments"}</small></span><b>⌄</b></summary>
    <div className="ek-workspace-list">{spaces.map(w=><Link key={w.id} aria-current={w.id===workspace.id?"page":undefined} href={`/${locale}/w/${w.id}/dashboard`}>{w.name} <span>↗</span></Link>)}<Link href={`/${locale}/workspaces`}>+ {locale==="bn"?"নতুন ওয়ার্কস্পেস":"New workspace"}</Link></div>
   </details>
   <nav className="ek-sidebar-nav" aria-label={locale==="bn"?"ওয়ার্কস্পেস নেভিগেশন":"Workspace navigation"}>
    {groupOrder.map(group=><div key={group} className="ek-sidebar-group"><span>{groupNames[locale][group]}</span>
     {(Object.keys(sections) as SectionKey[]).filter(k=>sections[k].group===group&&allowedSection(k,workspace.mode)).map(k=><Link key={k} aria-current={section===k?"page":undefined} className={section===k?"active":""} href={`${base}/${k==="overview"?"dashboard":k}`}>{sections[k][locale]}</Link>)}
    </div>)}
   </nav>
   <div className="ek-sidebar-bottom">{platformAdmin&&<Link href={`/${locale}/admin`}>{locale==="bn"?"প্ল্যাটফর্ম অ্যাডমিন":"Platform admin"} ↗</Link>}<form action={logoutAction.bind(null,locale)}><button type="submit">{locale==="bn"?"লগ আউট":"Sign out"} ↗</button></form></div>
  </aside>
  <div className="ek-dashboard-main">
   <header className="ek-dashboard-topbar"><div><span>EKMIVO / {workspace.name.toUpperCase()}</span><strong>{sections[section][locale]}</strong></div><div className="ek-dashboard-account"><span>{user.name}</span><span className="ek-avatar">{user.name.slice(0,1).toUpperCase()}</span></div></header>
   {children}
  </div>
 </main>;
}
