import { notFound } from "next/navigation";
import { requireWorkspace } from "../../../../../lib/server/auth";
import { DashboardContent } from "../../../../../components/dashboard-content";
import { allowedSection, sections, type SectionKey } from "../../../../../lib/dashboard-sections";
export const dynamic="force-dynamic";
export default async function WorkspaceSection({params}:{params:Promise<{locale:string;workspaceId:string;section:string}>}){
 const {locale:raw,workspaceId,section}=await params,locale=raw==="en"?"en":"bn";
 const {user,workspace}=await requireWorkspace(locale,workspaceId);
 if(!(section in sections)||!allowedSection(section,workspace.mode))notFound();
 return <DashboardContent locale={locale} user={user} workspace={workspace} section={section as SectionKey}/>;
}
