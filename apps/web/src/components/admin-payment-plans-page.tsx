import {database} from "../lib/server/db";
import {AdminPaymentPlans} from "./admin-payment-plans";
import type {AdminPaymentPlan} from "../lib/payment-plans";
export async function AdminPaymentPlansPage({locale,actor,workspace=""}:{locale:"en"|"bn";actor:string;workspace?:string}){
 let plans:AdminPaymentPlan[]=[],spaces:Array<{id:string;name:string}>=[],unavailable=false;
 try{
  const [r,w]=await Promise.all([database()`SELECT payment_plan_admin(${actor}::uuid,'read','{}'::jsonb) AS data`,database()`SELECT id,name FROM workspaces WHERE (${workspace}='' OR id::text=${workspace}) ORDER BY name LIMIT 200`]);
  plans=r[0].data.plans as AdminPaymentPlan[];spaces=w.map(x=>({id:String(x.id),name:String(x.name)}));
 }catch{unavailable=true}
 return <AdminPaymentPlans locale={locale} initial={plans} workspaces={spaces} initialWorkspace={workspace} unavailable={unavailable}/>;
}
