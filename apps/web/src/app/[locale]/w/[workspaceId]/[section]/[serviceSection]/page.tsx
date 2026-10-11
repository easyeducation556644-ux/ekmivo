import { notFound } from "next/navigation";
import { requireWorkspace } from "../../../../../../lib/server/auth";
import { DashboardContent } from "../../../../../../components/dashboard-content";
import { sectionInService, serviceEnabled } from "../../../../../../lib/dashboard-navigation";
export const dynamic = "force-dynamic";
export default async function ServiceSection({ params }: { params: Promise<{ locale: string; workspaceId: string; section: string; serviceSection: string }> }) {
 const {locale:raw,workspaceId,section:service,serviceSection:section}=await params,locale=raw==="en"?"en":"bn";
 const {user,workspace}=await requireWorkspace(locale,workspaceId);
 if((service!=="ai"&&service!=="payments")||!serviceEnabled(service,workspace.mode)||!sectionInService(service,section))notFound();
 return <DashboardContent locale={locale} user={user} workspace={workspace} service={service} section={section}/>;
}
