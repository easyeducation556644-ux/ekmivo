import { requireWorkspace } from "../../../../../lib/server/auth";
import { redirect } from "next/navigation";
import { dashboardHref, defaultService } from "../../../../../lib/dashboard-navigation";
export const dynamic="force-dynamic";
export default async function DashboardPage({params}:{params:Promise<{locale:string;workspaceId:string}>}){
 const {locale:raw,workspaceId}=await params,locale=raw==="en"?"en":"bn";
 const {workspace}=await requireWorkspace(locale,workspaceId);
 redirect(dashboardHref(locale,workspace.id,defaultService(workspace.mode)));
}
