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
 rawEnvironment: string | undefined | null,
): Promise<WorkspacePaymentContext> {
 const environment=canonicalEnvironment(rawEnvironment);
 if(!environment || (workspace.mode!=="commerce"&&workspace.mode!=="both")) notFound();
 const result=await database()`
 SELECT environment,status FROM workspace_environments
 WHERE workspace_id=${workspace.id}::uuid AND environment IN ('sandbox','live')
 ORDER BY environment`;
 const permitted=result.filter(row=>row.status==="active").map(row=>String(row.environment)) as PaymentEnvironment[];
 if(!permitted.includes(environment)) notFound();
 return {environment,status:"active",availableEnvironments:permitted,liveOperational:false};
}
