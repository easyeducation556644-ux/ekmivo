import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {currentUser,preferredWorkspaceFor,workspacesFor} from "../../../../lib/server/auth";
import {verificationEnabled} from "../../../../lib/server/email";
import {publicPaymentPlans} from "../../../../lib/server/payment-plans";
import {dashboardHref} from "../../../../lib/dashboard-navigation";
export async function GET(request:Request,{params}:{params:Promise<{locale:string;plan:string}>}){
 const {locale,plan}=await params;if(!["en","bn"].includes(locale)||!/^[a-z][a-z0-9_-]{1,39}$/.test(plan))return new Response(null,{status:404});
 const {plans,unavailable}=await publicPaymentPlans();if(unavailable)return new Response("Pricing unavailable",{status:503});
 const chosen=plans.find(p=>p.id===plan),jar=await cookies();if(!chosen){jar.delete("ekmivo-selected-plan");return NextResponse.redirect(new URL(`/${locale}/pricing`,request.url))}
 const user=await currentUser();
 if(!user){jar.set("ekmivo-selected-plan",plan,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:3600,path:"/"});return NextResponse.redirect(new URL(`/${locale}/register`,request.url))}
 if(!user.verified&&await verificationEnabled())return NextResponse.redirect(new URL(`/${locale}/verify-email`,request.url));
 const requested=new URL(request.url).searchParams.get("workspace");
 const workspace=requested?(await workspacesFor(user.id)).find(w=>w.id===requested):await preferredWorkspaceFor(user.id);
 if(!workspace||!["commerce","both"].includes(workspace.mode)){jar.set("ekmivo-selected-plan",plan,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:3600,path:"/"});return NextResponse.redirect(new URL(`/${locale}/workspaces`,request.url))}
 jar.delete("ekmivo-selected-plan");
 return NextResponse.redirect(new URL(dashboardHref(locale as "en"|"bn",workspace.id,"payments","billing")+"#plan-"+plan,request.url));
}
