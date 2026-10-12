import {notFound} from "next/navigation";
import {requireWorkspace} from "../../../../../../../lib/server/auth";
import {paymentContextFor} from "../../../../../../../lib/server/workspace-context";
import {PaymentOperations} from "../../../../../../../components/payment-operations";
export const dynamic="force-dynamic";
const resources=["payments","incoming","gateways","devices","webhooks","events"] as const;
export default async function PaymentDetail({params,searchParams}:{params:Promise<{locale:string;workspaceId:string;section:string;serviceSection:string;resourceID:string}>;searchParams:Promise<{env?:string|string[]}>}){
 const p=await params,locale=p.locale==="en"?"en":"bn";
 const {user,workspace}=await requireWorkspace(locale,p.workspaceId);
 if(p.section!=="payments"||!resources.includes(p.serviceSection as typeof resources[number])||!/^[a-f0-9-]{36}$/.test(p.resourceID))notFound();
 const query=await searchParams;if(Array.isArray(query.env))notFound();
 const context=await paymentContextFor(workspace,user.id,query.env);
 return <><h1>{locale==="bn"?"Record-এর বিস্তারিত":"Record details"}</h1><PaymentOperations key={user.id+workspace.id+context.environment+p.resourceID} locale={locale} workspaceId={workspace.id} userId={user.id} environment={context.environment} resource={p.serviceSection as typeof resources[number]} detailId={p.resourceID} canManage={["owner","admin"].includes(workspace.role)}/></>;
}
