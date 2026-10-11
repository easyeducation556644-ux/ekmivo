import { notFound, redirect } from "next/navigation";
import { requireWorkspace } from "../../../../../lib/server/auth";
import { allowedSection, sections, type SectionKey } from "../../../../../lib/dashboard-sections";
import { dashboardHref, sectionService } from "../../../../../lib/dashboard-navigation";
export const dynamic="force-dynamic";
export default async function WorkspaceSection({params}:{params:Promise<{locale:string;workspaceId:string;section:string}>}){
 const {locale:raw,workspaceId,section}=await params,locale=raw==="en"?"en":"bn";
 const {workspace}=await requireWorkspace(locale,workspaceId);
 if(!Object.hasOwn(sections,section)||!allowedSection(section,workspace.mode))notFound();
 redirect(dashboardHref(locale,workspaceId,sectionService(section as SectionKey,workspace.mode),section as SectionKey));
}
