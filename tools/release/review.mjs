import {readFile} from "node:fs/promises";
import {validateManifest,verifyFiles} from "./evidence.mjs";
const [filename,root=".",mode="audit"]=process.argv.slice(2);
if(!filename||!["audit","release"].includes(mode)){console.error("Usage: node tools/release/review.mjs <manifest.json> <repo-root> [audit|release]");process.exit(2)}
try{const manifest=JSON.parse(await readFile(filename,"utf8"));const errors=[...validateManifest(manifest,{release:mode==="release"}),...await verifyFiles(manifest,root)];console.log(JSON.stringify({mode,source_commit:manifest.source_commit,status:errors.length?"blocked":"evidence_valid",errors},null,2));process.exitCode=errors.length?1:0}catch{console.error("Evidence manifest cannot be read. No release approved.");process.exitCode=2}
