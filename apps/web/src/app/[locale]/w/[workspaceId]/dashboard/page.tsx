import { requireWorkspace } from "../../../../../lib/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dashboardHref, defaultService } from "../../../../../lib/dashboard-navigation";
export const dynamic="force-dynamic";
export default async function DashboardPage({params}:{params:Promise<{locale:string;workspaceId:string}>}){
 const {locale:raw,workspaceId}=await params,locale=raw==="en"?"en":"bn";
 const {workspace}=await requireWorkspace(locale,workspaceId);
 if(workspace.mode==="off")return <main className="ek-app-shell ek-workspace-page">
  <div className="ek-page-wrap">
   <p className="ek-page-kicker">EKMIVO / BUSINESS ACCESS</p>
   <h1>{locale==="bn"?"এই ব্যবসায় এখন কোনো সেবা চালু নেই":"No enabled products for this business"}</h1>
   <p className="ek-lead">{locale==="bn"?"আপনার সদস্যপদ আছে, কিন্তু AI ও Payments বন্ধ। Owner/Admin সেবা আবার চালু করতে পারবেন।":"You remain a member, but AI and Payments are disabled. An owner/admin can enable products."}</p>
   <Link className="ek-action" href={`/${locale}/workspaces`}>{locale==="bn"?"ব্যবসা পরিচালনা":"Manage businesses"}</Link>
  </div>
 </main>;
 redirect(dashboardHref(locale,workspace.id,defaultService(workspace.mode)));
}
