
import Link from "next/link";
import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {requireUser} from "../lib/server/auth";
import {database} from "../lib/server/db";
import {platformRole,platformSettings,verifiedAdmin} from "../lib/server/platform-admin";
import {sessionMfaValid} from "../lib/server/mfa";
import {mailReady} from "../lib/server/email";
import {publicSandboxConfig} from "../lib/server/public-sandbox";
import {VerificationSettings,RoleControls} from "./admin-controls";
import {AdminShell,type AdminLocale} from "./platform-admin-shell";
import {AdminModal,AdminCopy} from "./platform-admin-widgets";

type RecordRow={id:string;cells:string[];href?:string};
type RecordPage={columns:string[];rows:RecordRow[];next?:string};
type Props={locale:AdminLocale;segments?:string[];query?:string;after?:string};
const names:Record<string,[string,string]>={
 "":["Overview","ওভারভিউ"],workspaces:["Workspaces","ওয়ার্কস্পেস"],users:["Users","ব্যবহারকারী"],
 payments:["Payments","পেমেন্ট"],billing:["Billing","বিলিং"],credits:["API credits","এপিআই ক্রেডিট"],
 plans:["Plans","প্ল্যান"],"gateway/providers":["Providers","প্রোভাইডার"],"gateway/devices":["Receipt devices","রিসিপ্ট ডিভাইস"],
 "gateway/webhooks":["Webhooks & jobs","ওয়েবহুক ও জব"],ai:["AI Bot","এআই বট"],
 api:["API & sandbox","এপিআই ও স্যান্ডবক্স"],health:["Platform health","প্ল্যাটফর্মের অবস্থা"],
 staff:["Staff & security","স্টাফ ও নিরাপত্তা"],audit:["Audit log","অডিট লগ"],settings:["Settings","সেটিংস"]
};
const tabs:Record<string,string[]>={
 payments:["Payments","Exceptions","Disputes","Refunds","Reconciliation"],
 billing:["Subscriptions","Invoices","Revenue","Coupons"],
 credits:["Balances","Ledger","Packs","Rules"],
 plans:["Payment gateway","AI Bot"],
 "gateway/webhooks":["Deliveries","Endpoints","Queues"],
 ai:["Workspaces","Models & usage","Conversations","Safety","Handover"],
 api:["Keys","Sandbox","Limits","Versions"],
 staff:["Staff","Roles","Sessions","Security policy"],
 settings:["Authentication & email","Feature flags","Legal & contact"]
};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
function label(locale:AdminLocale,en:string,bn:string){return locale==="bn"?bn:en;}
function short(v:string){return v.length>12?v.slice(0,8)+"…":v;}
function formatDate(value:unknown,locale:AdminLocale){if(!value)return "—";const d=new Date(String(value));return Number.isNaN(d.valueOf())?"—":new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(d);}
function titleCase(s:string){return s.replace(/[._-]/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function PageHead({title,action,description}:{title:string;action?:React.ReactNode;description?:string}){return <div className="pa-page-head"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action&&<div className="pa-page-actions">{action}</div>}</div>;}
function Offline({locale,description}:{locale:AdminLocale;description?:string}){return <div className="pa-surface pa-not-connected"><p><span className="pa-muted-dot"/>{label(locale,"Not connected","সংযুক্ত নয়")}</p><span>{description||label(locale,"The platform backend does not provide this capability yet.","এই সুবিধাটি এখনো প্ল্যাটফর্মের backend-এ যুক্ত হয়নি।")}</span></div>;}
function Denied({locale}:{locale:AdminLocale}){return <div className="pa-surface pa-not-connected"><p>{label(locale,"You don't have access to this information.","এই তথ্য দেখার অনুমতি নেই।")}</p></div>;}
function PageTabs({locale,base,items,active}:{locale:AdminLocale;base:string;items:string[];active?:string}){return <nav className="pa-tabs" aria-label="Sections">{items.map((name,i)=>{const slug=name.toLowerCase().replaceAll(" & ","-").replaceAll(" ","-");return <Link key={slug} href={base+"/"+slug} aria-current={(active||items[0].toLowerCase().replaceAll(" & ","-").replaceAll(" ","-"))===slug?"page":undefined}>{name}</Link>;})}</nav>;}
function Search({locale,query}:{locale:AdminLocale;query:string}){return <form className="pa-filter-bar" method="get"><label htmlFor="pa-list-search" className="pa-sr-only">Search</label><input id="pa-list-search" type="search" maxLength={80} name="q" defaultValue={query} placeholder={label(locale,"Search name, ID or email","নাম, আইডি বা ইমেইল খুঁজুন")}/><button className="pa-button pa-button-secondary" type="submit">{label(locale,"Search","খুঁজুন")}</button><button className="pa-button pa-button-secondary" type="button" disabled title="Audited export is not connected">Export CSV</button></form>;}
function Records({locale,page,base,query}:{locale:AdminLocale;page:RecordPage;base:string;query:string}){return <section className="pa-surface pa-table-card"><div className="pa-table-wrap"><table><thead><tr>{page.columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>
 {page.rows.map(row=><tr key={row.id}>{row.cells.map((cell,i)=><td key={i} className={i===0?"pa-primary-cell":""}>{i===0&&row.href?<Link href={row.href}>{cell}</Link>:cell}{i===0&&UUID.test(row.id)&&<AdminCopy value={row.id} label="Copy full ID"/>}</td>)}</tr>)}
 {!page.rows.length&&<tr><td className="pa-empty-row" colSpan={page.columns.length}>{label(locale,"No matching records","কোনো তথ্য পাওয়া যায়নি")}</td></tr>}
 </tbody></table></div><div className="pa-table-footer"><span>{page.rows.length} {label(locale,"records","রেকর্ড")}</span>{page.next&&<Link className="pa-button pa-button-secondary" href={base+"?"+new URLSearchParams({q:query,after:page.next}).toString()}>{label(locale,"Next page","পরের পৃষ্ঠা")} →</Link>}</div></section>;}
function Fields({values}:{values:Array<[string,string,string?]>}){return <div className="pa-surface pa-description"><dl>{values.map(([key,value,copy])=><div className="pa-description-row" key={key}><dt>{key}</dt><dd>{value}{copy&&<AdminCopy value={copy} label="Copy ID"/>}</dd></div>)}</dl></div>;}
async function workspaces(locale:AdminLocale,query:string,after:string):Promise<RecordPage>{
 const term="%"+query+"%",cursor=UUID.test(after)?after:null;
 const r=await database()`SELECT w.id,w.name,w.created_at,
 (SELECT u.email FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w.id AND m.role='owner' LIMIT 1) AS owner,
 EXISTS(SELECT 1 FROM workspace_product_access p WHERE p.workspace_id=w.id AND p.product='payments' AND p.enabled=true) AS pay,
 EXISTS(SELECT 1 FROM workspace_product_access p WHERE p.workspace_id=w.id AND p.product='ai' AND p.enabled=true) AS ai
 FROM workspaces w WHERE (${query}='' OR w.name ILIKE ${term} OR w.id::text ILIKE ${term}
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w.id AND m.role='owner' AND u.email ILIKE ${term}))
 AND (${cursor}::uuid IS NULL OR w.id<${cursor}::uuid) ORDER BY w.id DESC LIMIT 26`;
 const p=r.slice(0,25);return {columns:["Workspace","Owner","Payment gateway","AI Bot","Created"],
 rows:p.map(v=>({id:String(v.id),href:"/"+locale+"/admin/workspaces/"+v.id,cells:[String(v.name)+" · "+short(String(v.id)),v.owner?String(v.owner):"—",v.pay?"Enabled":"Disabled",v.ai?"Enabled":"Disabled",formatDate(v.created_at,locale)]})),next:r.length>25?String(p[p.length-1].id):undefined};
}
async function users(locale:AdminLocale,query:string,after:string,staffOnly=false):Promise<RecordPage>{
 const term="%"+query+"%",cursor=UUID.test(after)?after:null;
 const r=await database()`SELECT u.id,u.display_name,u.email,u.email_verified_at,u.created_at,p.role,
 EXISTS(SELECT 1 FROM platform_admin_mfa m WHERE m.user_id=u.id AND m.confirmed_at IS NOT NULL) AS has_mfa
 FROM app_users u LEFT JOIN platform_administrators p ON p.user_id=u.id
 WHERE (${query}='' OR u.display_name ILIKE ${term} OR u.email ILIKE ${term} OR u.id::text ILIKE ${term})
 AND (${cursor}::uuid IS NULL OR u.id<${cursor}::uuid)
 AND (${staffOnly}=false OR p.user_id IS NOT NULL) ORDER BY u.id DESC LIMIT 26`;
 const p=r.slice(0,25);
 return {columns:["User","Email","Verified","MFA","Admin role","Created"],rows:p.map(v=>({id:String(v.id),href:"/"+locale+"/admin/users/"+v.id,cells:[String(v.display_name),String(v.email),v.email_verified_at?"Verified":"Unverified",v.has_mfa?"On":"Off",v.role?titleCase(String(v.role)):"—",formatDate(v.created_at,locale)]})),next:r.length>25?String(p[p.length-1].id):undefined};
}
async function audit(locale:AdminLocale,query:string):Promise<RecordPage>{
 const term="%"+query+"%";
 const r=await database()`SELECT a.actor_id,a.action,a.subject_id,a.occurred_at,u.display_name FROM platform_admin_audit a
 LEFT JOIN app_users u ON u.id=a.actor_id WHERE (${query}='' OR a.action ILIKE ${term} OR u.email ILIKE ${term})
 ORDER BY a.occurred_at DESC LIMIT 25`;
 return {columns:["Time","Actor","Action","Target"],rows:r.map((v,i)=>({id:"audit-"+i,cells:[formatDate(v.occurred_at,locale),v.display_name?String(v.display_name):"—",titleCase(String(v.action)),v.subject_id?short(String(v.subject_id)):"—"]}))};
}
async function Details({locale,kind,id}:{locale:AdminLocale;kind:"users"|"workspaces";id:string}){
 if(!UUID.test(id))notFound();
 if(kind==="users"){
 const r=await database()`SELECT u.id,u.display_name,u.email,u.email_verified_at,u.created_at,p.role FROM app_users u LEFT JOIN platform_administrators p ON p.user_id=u.id WHERE u.id=${id}::uuid LIMIT 1`;
 if(!r.length)notFound();const u=r[0];return <><PageHead title={String(u.display_name)} action={<Link className="pa-button pa-button-secondary" href={"/"+locale+"/admin/users"}>← Users</Link>}/><Fields values={[["User ID",short(String(u.id)),String(u.id)],["Email",String(u.email)],["Email verified",u.email_verified_at?"Yes":"No"],["Admin role",u.role?titleCase(String(u.role)):"—"],["Created",formatDate(u.created_at,locale)]]}/><Offline locale={locale} description="Sessions, security actions and user activity are not connected."/></>;
 }
 const r=await database()`SELECT w.id,w.name,w.created_at,
 (SELECT u.email FROM workspace_members m JOIN app_users u ON u.id=m.user_id WHERE m.workspace_id=w.id AND m.role='owner' LIMIT 1) AS owner,
 EXISTS(SELECT 1 FROM workspace_product_access p WHERE p.workspace_id=w.id AND p.product='payments' AND p.enabled=true) AS pay,
 EXISTS(SELECT 1 FROM workspace_product_access p WHERE p.workspace_id=w.id AND p.product='ai' AND p.enabled=true) AS ai
 FROM workspaces w WHERE w.id=${id}::uuid LIMIT 1`;
 if(!r.length)notFound();const w=r[0];return <><PageHead title={String(w.name)} action={<Link className="pa-button pa-button-secondary" href={"/"+locale+"/admin/workspaces"}>← Workspaces</Link>}/><PageTabs locale={locale} base={"/"+locale+"/admin/workspaces/"+id} items={["Overview","Products & plan","Members","Payments","Devices","API keys","Usage & credits","Billing","Activity"]}/><Fields values={[["Workspace ID",short(String(w.id)),String(w.id)],["Owner",w.owner?String(w.owner):"—"],["Payment gateway",w.pay?"Enabled":"Disabled"],["AI Bot",w.ai?"Enabled":"Disabled"],["Created",formatDate(w.created_at,locale)]]}/><Offline locale={locale} description="Plan changes, suspensions, credits and product actions are not connected."/></>;
}
function Stat({title,value,unavailable=false}:{title:string;value:string|number;unavailable?:boolean}){return <div className="pa-stat"><span>{title}</span><strong>{value}</strong>{unavailable&&<small>Not connected</small>}</div>;}
async function Overview({locale,isSuper}:{locale:AdminLocale;isSuper:boolean}){
 const [r,activities]=await Promise.all([
 database()`SELECT (SELECT count(*) FROM workspaces)::int AS workspaces,(SELECT count(*) FROM app_users)::int AS users,(SELECT count(*) FROM workspaces WHERE created_at>=now()-interval '7 days')::int AS recent`,
 isSuper?database()`SELECT a.action,a.occurred_at,u.display_name FROM platform_admin_audit a LEFT JOIN app_users u ON u.id=a.actor_id ORDER BY a.occurred_at DESC LIMIT 5`:Promise.resolve([])
 ]);
 const c=r[0];
 return <><PageHead title={label(locale,"Overview","ওভারভিউ")} action={<span className="pa-date-label">{label(locale,"Last 7 days","শেষ ৭ দিন")}</span>}/>
 <section className="pa-surface pa-stats-strip">
 <Stat title="Active workspaces" value="—" unavailable/><Stat title="New workspaces" value={Number(c.recent)}/><Stat title="Verified volume" value="—" unavailable/><Stat title="Payment success rate" value="—" unavailable/><Stat title="MRR" value="—" unavailable/><Stat title="Credits consumed" value="—" unavailable/></section>
 <div className="pa-overview-grid"><section className="pa-surface pa-chart-panel"><h2>Verified volume</h2><Offline locale={locale}/></section><section className="pa-surface pa-chart-panel"><h2>Needs attention</h2>{["Receipt exceptions","Open disputes","Failed webhooks","Devices offline","Past-due subscriptions","Workspaces near credit limit"].map(item=><div className="pa-attention-row" key={item}><span>{item}</span><span>—</span></div>)}</section></div>
 <div className="pa-overview-grid"><section className="pa-surface pa-chart-panel"><h2>Signups & activation</h2><Offline locale={locale}/></section><section className="pa-surface pa-chart-panel"><h2>Top workspaces by volume</h2><Offline locale={locale}/></section></div>
 <div className="pa-overview-grid"><section className="pa-surface pa-chart-panel"><div className="pa-split-head"><h2>Recent admin activity</h2><Link href={"/"+locale+"/admin/audit"}>View all →</Link></div>{!isSuper?<p className="pa-subtle">Access restricted</p>:!activities.length?<p className="pa-subtle">No activity yet.</p>:activities.map((v,i)=><div className="pa-attention-row" key={i}><span>{titleCase(String(v.action))} <small>{v.display_name?String(v.display_name):""}</small></span><span>{formatDate(v.occurred_at,locale)}</span></div>)}</section><section className="pa-surface pa-chart-panel"><h2>System status</h2>{["API","Checkout","Webhooks","Workers"].map(n=><div className="pa-attention-row" key={n}><span>{n}</span><span>—</span></div>)}<p className="pa-subtle">Not connected</p></section></div>
 </>;
}
export async function PlatformAdminConsole({locale,segments=[],query="",after=""}:Props){
 const user=await requireUser(locale);
 const role=await platformRole(user.id);
 if(!role)notFound();
 if(!await sessionMfaValid(user.id))redirect("/"+locale+"/admin/mfa");
 const admin=await verifiedAdmin();
 if(!admin||admin.user.id!==user.id)notFound();
 const key=segments[0]==="gateway"?"gateway/"+(segments[1]||""):segments[0]||"";
 if(!Object.prototype.hasOwnProperty.call(names,key))notFound();
 const extra=segments[0]==="gateway"?segments.slice(2):segments.slice(1);
 const sub=extra[0]||"",base="/"+locale+"/admin"+(key?"/"+key:"");
 const t=names[key][locale==="bn"?1:0],isSuper=role==="super_admin",q=query.trim().slice(0,80);
 const cookie=await cookies();const rawTheme=cookie.get("ekmivo-theme")?.value;const theme=rawTheme==="light"||rawTheme==="dark"?rawTheme:"system";
 let body:React.ReactNode;
 if(!key){body=<Overview locale={locale} isSuper={isSuper}/>;}
 else if((key==="workspaces"||key==="users")&&extra[0]){
 body=isSuper?<Details locale={locale} kind={key} id={extra[0]}/>:<><PageHead title={t}/><Denied locale={locale}/></>;
 }else if(key==="workspaces"||key==="users"||key==="audit"){
 const page=isSuper?(key==="workspaces"?await workspaces(locale,q,after):key==="users"?await users(locale,q,after):await audit(locale,q)):null;
 body=<><PageHead title={t}/>{page?<><Search locale={locale} query={q}/><Records locale={locale} base={base} query={q} page={page}/></>:<Denied locale={locale}/>}</>;
 }else if(key==="staff"){
 const page=isSuper&&(!sub||sub==="staff")?await users(locale,q,after,true):null;
 let list:Array<{id:string;name:string;email:string;verified:boolean;role:string|null}>=[];
 if(isSuper&&(!sub||sub==="staff")){const r=await database()`SELECT u.id,u.display_name,u.email,u.email_verified_at,p.role FROM app_users u LEFT JOIN platform_administrators p ON p.user_id=u.id ORDER BY u.created_at DESC LIMIT 80`;list=r.map(v=>({id:String(v.id),name:String(v.display_name),email:String(v.email),verified:!!v.email_verified_at,role:v.role?String(v.role):null}));}
 body=<><PageHead title={t} action={isSuper&&page?<AdminModal title="Staff roles" label="Manage roles"><RoleControls locale={locale} users={list}/></AdminModal>:undefined}/><PageTabs locale={locale} base={base} items={tabs[key]} active={sub}/>{!isSuper?<Denied locale={locale}/>:page?<><Search locale={locale} query={q}/><Records locale={locale} base={base} query={q} page={page}/></>:<Offline locale={locale}/>}</>;
 }else if(key==="settings"){
 const settings=isSuper?await platformSettings():null;
 body=<><PageHead title={t}/><PageTabs locale={locale} base={base} items={tabs[key]} active={sub}/>{!isSuper?<Denied locale={locale}/>:(!sub||sub==="authentication-email")&&settings?<section className="pa-surface pa-settings-grid"><div><h2>Email verification</h2><p>{settings.emailVerification?"Required":"Off"}</p><span className="pa-status-text"><span className={"pa-status-dot "+(mailReady()?"green":"grey")}/>Resend: {mailReady()?"Connected":"Not connected"}</span></div><AdminModal label="Edit settings" title="Authentication & email"><VerificationSettings locale={locale} enabled={settings.emailVerification} providerReady={mailReady()}/></AdminModal></section>:<Offline locale={locale}/>}</>;
 }else if(key==="api"){
 let config:Awaited<ReturnType<typeof publicSandboxConfig>>=null;
 if(isSuper&&sub==="sandbox"){try{config=await publicSandboxConfig();}catch{config=null;}}
 body=<><PageHead title={t}/><PageTabs locale={locale} base={base} items={tabs[key]} active={sub}/>{!isSuper?<Denied locale={locale}/>:sub==="sandbox"&&config?<section className="pa-surface pa-description"><h2>Public sandbox</h2><p className="pa-subtle">Test data only. Never use real customer data.</p><dl><div className="pa-description-row"><dt>Shared test key</dt><dd className="pa-mono">{config.testKey.slice(0,12)+"••••"+config.testKey.slice(-4)}</dd></div><div className="pa-description-row"><dt>Workspace</dt><dd>{short(config.workspaceId)}<AdminCopy value={config.workspaceId} label="Copy workspace ID"/></dd></div><div className="pa-description-row"><dt>Sandbox API URL</dt><dd>{config.apiOrigin||"—"}</dd></div><div className="pa-description-row"><dt>Status</dt><dd>{config.enabled?"Enabled":"Disabled"}</dd></div></dl><div className="pa-inline-actions"><button className="pa-button pa-button-secondary" disabled>Check service</button><button className="pa-button pa-button-secondary" disabled>Rotate key</button><button className="pa-button pa-button-secondary" disabled>Revoke key</button></div><p className="pa-subtle">Audited step-up operations not connected.</p></section>:<Offline locale={locale}/>}</>;
 }else{
 body=<><PageHead title={t}/>{tabs[key]&&<PageTabs locale={locale} base={base} items={tabs[key]} active={sub}/>}<Offline locale={locale} description={key==="ai"?"AI Bot administrative metrics are still in development.":undefined}/></>;
 }
 return <AdminShell locale={locale} role={role} name={user.name} theme={theme} production={process.env.NODE_ENV==="production"}>{body}</AdminShell>;
}
