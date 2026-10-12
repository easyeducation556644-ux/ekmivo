import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
const require=createRequire(import.meta.url),loaded=new Map();
let pathname="/en/w/test/payments/overview";
function load(path){
 if(loaded.has(path))return loaded.get(path);
 const exports={};loaded.set(path,exports);
 const source=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(source,{exports,require(id){
  if(id==="next/navigation")return {usePathname:()=>pathname};
  if(id.startsWith("."))return load(resolve(dirname(path),id+".ts"));
  return require(id);
 }},{timeout:3000});
 return exports;
}
const root=fileURLToPath(new URL("../src/",import.meta.url));
const {DashboardPageSkeleton}=load(resolve(root,"components/dashboard-page-skeleton.tsx"));
for(const [locale,route,label] of [["en","overview","Your working overview"],["bn","developers","ডেভেলপার"],["en","payments","Transactions"]]){
 pathname=`/${locale}/w/test/payments/${route}`;
 const html=renderToStaticMarkup(React.createElement(DashboardPageSkeleton));
 assert.ok(html.includes(label),"Skeleton must identify the requested page");
 assert.ok(html.includes('aria-busy="true"'));
 assert.ok(!html.includes("<main")&&!html.includes("Loading workspace")&&!html.includes("ekmivo"),"Fallback must be content-only, never replace dashboard shell");
}
// The App Router owns route loading. Retain the previous, authorized page
// during a client transition; otherwise the click renders one skeleton and
// the streamed route renders another, producing a visible double flash.
const frameSource=readFileSync(resolve(root,"components/dashboard-frame.tsx"),"utf8");
assert.match(frameSource,/<main id="dashboard-content"[^>]*aria-busy=\{isNavigating\}>\{children\}<\/main>/,
 "Dashboard must preserve authorized content and announce pending navigation");
assert.doesNotMatch(frameSource,/isNavigating\s*\?\s*<DashboardPageSkeleton/,
 "Client transition must not replace the entire content with an immediate skeleton");
const paymentContextSource=readFileSync(resolve(root,"lib/server/workspace-context.ts"),"utf8");
assert.match(paymentContextSource,/const authorizedEnvironments=cache\(async \(workspaceId:string,userId:string\)/,
 "Product shell and page should share one request-scoped lookup");
assert.match(paymentContextSource,/const permitted=await authorizedEnvironments\(workspace.id,userId\)/,
 "Both code paths must consult the request-scoped authorized result");
for(const guard of ["JOIN workspace_members member","JOIN app_users actor","actor.disabled_at IS NULL","member.user_id=","env.workspace_id="]){
 assert.ok(paymentContextSource.includes(guard),"Authorization guard absent from environment query: "+guard);
}
console.log("PG02 PASS: EN/BN content-only route skeletons and non-flashing persistent dashboard content during transitions");
