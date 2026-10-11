import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser, workspacesFor } from "../../../lib/server/auth";
import { WorkspaceOnboarding } from "../../../components/workspace-onboarding";
export const dynamic="force-dynamic";
export default async function WorkspacesPage({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="en"?"en":"bn";
 const user=await requireUser(locale);
 const spaces=await workspacesFor(user.id);
 return <main className="ek-app-shell ek-workspace-page">
  <div className="ek-app-topbar"><Link href={`/${locale}`} className="ek-wordmark">ekmivo.</Link><div><span>{user.name}</span><span className="ek-avatar">{user.name.slice(0,1).toUpperCase()}</span></div></div>
  <div className="ek-page-wrap">
   {spaces.length>0&&<section className="ek-existing" aria-labelledby="workspace-existing"><div className="ek-page-kicker">YOUR WORKSPACES / {spaces.length}</div><h2 id="workspace-existing">{locale==="bn"?"আপনার ওয়ার্কস্পেস":"Your workspaces"}</h2><div className="ek-existing-grid">{spaces.map(w=><Link className="ek-existing-card" key={w.id} href={`/${locale}/w/${w.id}/dashboard`}><span className="ek-avatar">{w.name.slice(0,1).toUpperCase()}</span><div><strong>{w.name}</strong><small>{w.mode==="both"?"AI + Commerce":w.mode==="ai"?"AI Communication":"Commerce & Payments"} · {w.role}</small></div><span>↗</span></Link>)}</div></section>}
   <WorkspaceOnboarding locale={locale} userId={user.id}/>
  </div>
 </main>;
}
