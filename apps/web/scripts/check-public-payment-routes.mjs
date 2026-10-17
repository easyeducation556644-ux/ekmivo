import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..","src","components");
const targets=[
 "payment-documents.tsx","payment-requests.tsx","payment-billing.tsx",
 "public-document.tsx","hosted-invoice.tsx"
];
const forbidden=[
 {name:"hardcoded locale in public payment URL",pattern:/\/(?:en|bn)\/(?:invoice|checkout|pay)\//g},
 {name:"template locale prefix in public payment URL",pattern:/\/\$\{locale\}\/(?:invoice|checkout|pay)\//g},
 {name:"concatenated locale prefix in public payment URL",pattern:/\/"\+locale\+"\/(?:invoice|checkout|pay)\//g},
];
let errors=0;
for(const file of targets){
 const text=readFileSync(resolve(root,file),"utf8");
 for(const rule of forbidden){
  const matches=[...text.matchAll(rule.pattern)];
  for(const match of matches){
   const line=text.slice(0,match.index).split("\n").length;
   process.stderr.write(`${file}:${line}: ${rule.name} (${match[0]})\n`);
   errors++;
  }
 }
}
if(errors)process.exit(1);
console.log("Canonical language-neutral invoice, checkout and pay URL checks passed.");
