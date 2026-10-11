import "server-only";
import { notFound } from "next/navigation";
import { database } from "./db";
import type { Workspace } from "./auth";
import { canonicalEnvironment, type PaymentEnvironment } from "../dashboard-navigation";

export type WorkspacePaymentContext = {
 environment: PaymentEnvironment;
 status: "active" | "suspended";
 availableEnvironments: PaymentEnvironment[];
 liveOperational: false;
};

// The URL is a request, NEVER authority. The tenant has already been checked
// by requireWorkspace before this query. Environment status is server-validated.
// "active" here only means the context is provisioned; no payment API exists yet.
export async function paymentContextFor(
 workspace: Workspace,
 userId: string,
 rawEnvironment: string | undefined | null,
 shellOnly=false,
): Promise<WorkspacePaymentContext> {
 const environment=canonicalEnvironment(rawEnvironment);
 if(!environment || (workspace.mode!=="commerce"&&workspace.mode!=="both")) notFound();
 const result=await database()`
 SELECT env.environment,env.status
 FROM workspace_environments env
 JOIN workspace_members member ON member.workspace_id=env.workspace_id
 JOIN app_users actor ON actor.id=member.user_id
 WHERE env.workspace_id=${workspace.id}::uuid
 AND member.user_id=${userId}::uuid
 AND actor.disabled_at IS NULL
 AND env.environment IN ('sandbox','live')
 ORDER BY env.environment`;
 const permitted=result.filter(row=>row.status==="active").map(row=>String(row.environment)) as PaymentEnvironment[];
 const selected=shellOnly?(permitted.includes("sandbox")?"sandbox":permitted[0]):environment;
 if(!selected||!permitted.includes(selected)) notFound();
 return {environment:selected,status:"active",availableEnvironments:permitted,liveOperational:false};
}
