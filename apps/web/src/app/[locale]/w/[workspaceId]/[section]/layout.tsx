import {notFound} from "next/navigation";
import {AppShell} from "../../../../../components/app-shell";
import {requireWorkspace} from "../../../../../lib/server/auth";
import {paymentContextFor} from "../../../../../lib/server/workspace-context";
import {serviceEnabled} from "../../../../../lib/dashboard-navigation";

export default async function ProductLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string;workspaceId:string;section:string}>}){
 const {locale:raw,workspaceId,section:service}=await params;
 // Legacy section URLs redirect in their own page, without a nested shell.
 if(service!=="payments"&&service!=="ai")return children;
 const locale=raw==="en"?"en":"bn";
 const {user,workspace}=await requireWorkspace(locale,workspaceId);
 if(!serviceEnabled(service,workspace.mode))notFound();
 // Layouts have no searchParams. This selects permitted shell choices only;
 // every page still validates the exact requested environment and membership.
 const context=service==="payments"?await paymentContextFor(workspace,user.id,undefined,true):undefined;
 return <AppShell locale={locale} user={user} workspace={workspace} service={service} section="overview" paymentContext={context}>{children}</AppShell>;
}
