import { requireWorkspace } from "../../../../../lib/server/auth";
import { DashboardContent } from "../../../../../components/dashboard-content";
export const dynamic="force-dynamic";
export default async function DashboardPage({params}:{params:Promise<{locale:string;workspaceId:string}>}){
 const {locale:raw,workspaceId}=await params,locale=raw==="en"?"en":"bn";
 const {user,workspace}=await requireWorkspace(locale,workspaceId);
 return <DashboardContent locale={locale} user={user} workspace={workspace} section="overview"/>;
}
