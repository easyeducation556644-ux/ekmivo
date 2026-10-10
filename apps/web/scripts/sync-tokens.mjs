import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDir, "../../../docs/design/tokens.css");
const target = resolve(scriptDir, "../src/styles/tokens.css");
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("Synced canonical design tokens.");
