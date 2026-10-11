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
pathname="/en/w/test/payments/overview";
assert.ok(renderToStaticMarkup(React.createElement(DashboardPageSkeleton,{targetSection:"developers"})).includes("Developers"),"Pending click must show target skeleton before URL commits");
console.log("PG02 PASS: actual content-only EN/BN route skeletons, page identity and immediate target state");
