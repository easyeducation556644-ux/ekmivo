// PG02 real SiteControls navigation under TS transpilation.
// A blocked unsaved draft must not mutate the locale cookie or router.
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const tsx=await readFile(new URL("../src/components/site-controls.tsx",import.meta.url),"utf8");
const js=ts.transpileModule(tsx,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX
}}).outputText;
const pushed=[],persisted=[],events=[];
let blocked=true;
const root={dataset:{},removeAttribute(name){if(name==="data-theme")delete this.dataset.theme}};
const doc={documentElement:root,set cookie(value){persisted.push(value)},get cookie(){return persisted.at(-1)||""}};
const win={
 location:{search:"?env=live",hash:"#detail"},
 addEventListener(){},removeEventListener(){},
 dispatchEvent(event){events.push(event);return !blocked;},
 localStorage:{setItem(key,value){persisted.push(key+"="+value)}}
};
class TestEvent{constructor(name,options){this.type=name;this.detail=options.detail;this.cancelable=options.cancelable;}}
const jsx=(type,props,key)=>({type,props,key});
const sandbox={
 exports:{},CustomEvent:TestEvent,document:doc,window:win,
 require(id){
  if(id==="next/navigation")return {usePathname:()=>"/bn/w/11111111-1111-4111-a111-111111111111/payments/overview",useRouter:()=>({push:href=>pushed.push(href)})};
  if(id==="react")return {useState:initial=>[initial,()=>{}],useEffect:fn=>fn()};
  if(id==="react/jsx-runtime")return {jsx,jsxs:jsx};
  throw Error("Unexpected module "+id);
 }
};
vm.runInNewContext(js,sandbox,{timeout:3000});
const ui=sandbox.exports.SiteControls({locale:"bn",initialTheme:"system"});
function find(element,predicate){
 if(Array.isArray(element)){for(const child of element){const hit=find(child,predicate);if(hit)return hit;}return null;}
 if(!element||typeof element!=="object")return null;
 if(predicate(element))return element;
 return find(element.props?.children,predicate);
}
const lang=find(ui,n=>n.type==="select"&&n.props.id==="site-locale");
const theme=find(ui,n=>n.type==="select"&&n.props.id==="site-theme");
assert.ok(lang&&theme);
assert.match(doc.cookie,/ekmivo-locale=bn/);
lang.props.onChange({target:{value:"en"}});
assert.equal(pushed.length,0,"Draft cancellation triggered route change");
assert.match(doc.cookie,/ekmivo-locale=bn/,"Draft cancellation changed stored locale");
assert.equal(events[0].detail.href,"/en/w/11111111-1111-4111-a111-111111111111/payments/overview?env=live#detail");
blocked=false;
lang.props.onChange({target:{value:"en"}});
assert.equal(pushed.length,1);
assert.equal(pushed[0],events[1].detail.href);
assert.match(doc.cookie,/ekmivo-locale=en/);
theme.props.onChange({target:{value:"dark"}});
assert.equal(doc.documentElement.dataset.theme,"dark");
assert.match(doc.cookie,/ekmivo-theme=dark/);
theme.props.onChange({target:{value:"system"}});
assert.equal(doc.documentElement.dataset.theme,undefined);
assert.match(doc.cookie,/ekmivo-theme=system/);
console.log("PG02 PASS: blocked draft locale cannot mutate cookie, accepted route retains env/hash, theme/System semantics");
