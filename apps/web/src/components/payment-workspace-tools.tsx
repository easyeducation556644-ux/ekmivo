"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {registerDraft} from "../lib/client/draft-navigation";
import {PaymentPrivacy} from "./payment-privacy";

type Member={id:string;name:string;email?:string;role:"owner"|"admin"|"editor"|"viewer";joined_at?:string};
type Invitation={id:string;email:string;role:string;expires_at:string};
type Reply={message:string;created_at:string};
type Ticket={id:string;subject:string;message:string;status:string;created_at:string;replies?:Reply[]};
type Settings={name:string;support_email:string;support_url:string;legal_url:string;timezone:string;locale:string;notification_email:string;logo_url:string;checkout_title:string;checkout_description:string};
type Resource="team"|"settings"|"help";
type ApiData={members?:Member[];invitations?:Invitation[];grants?:Record<string,Record<string,boolean>>;body?:Partial<Settings>;version?:number;items?:Ticket[]};
type Result={error?:{code?:string};code?:string;invitation_token?:string};
const defaults:Settings={name:"",support_email:"",support_url:"",legal_url:"",timezone:"Asia/Dhaka",locale:"bn",notification_email:"",logo_url:"",checkout_title:"",checkout_description:""};
const caps=[
 ["product:payments","Payment service","পেমেন্ট সেবা"],["payments:read","View payments","পেমেন্ট দেখা"],
 ["payments:issue","Create payment requests","পেমেন্ট রিকোয়েস্ট তৈরি"],["payments:manage","Manage payments","পেমেন্ট পরিচালনা"],
 ["payments:export","Export payment records","পেমেন্ট export"],["workspace:settings","Edit business settings","ব্যবসার সেটিংস"],
 ["members:manage","Manage team","সদস্য পরিচালনা"]
] as const;
const fields={
 name:["Business name","ব্যবসার নাম"],checkout_title:["Checkout heading","চেকআউট শিরোনাম"],
 checkout_description:["Checkout description","চেকআউট বিবরণ"],logo_url:["Checkout logo URL","চেকআউট লোগো URL"],
 support_email:["Support email","সহায়তার ইমেইল"],notification_email:["Notification email","নোটিফিকেশন ইমেইল"],
 support_url:["Support website","সহায়তার ওয়েবসাইট"],legal_url:["Legal / terms URL","নীতিমালা / শর্তাবলি"],
 timezone:["Timezone","সময়ের অঞ্চল"],locale:["Default language","পূর্বনির্ধারিত ভাষা"]
} as const;
function at(value?:string,locale:"en"|"bn"="en"){
 if(!value||!Number.isFinite(Date.parse(value)))return "—";
 return new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-BD",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(new Date(value));
}
function isHttps(value:string){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!!u.hostname}catch{return false}}
function formatSettings(body:Settings):Settings{return Object.fromEntries(Object.entries(body).map(([k,v])=>[k,v.trim()])) as unknown as Settings}
export function PaymentWorkspaceTools({locale,workspaceId,environment,resource,canManage,isOwner,userId}:{locale:"en"|"bn";workspaceId:string;environment:string;resource:Resource;canManage:boolean;isOwner:boolean;userId:string}){
 const router=useRouter(),bn=locale==="bn";
 const t=useCallback((en:string,bengali:string)=>bn?bengali:en,[bn]);
 const base="/api/go/workspaces/"+workspaceId+"/workspace-tools";
 const [members,setMembers]=useState<Member[]>([]),[invites,setInvites]=useState<Invitation[]>([]),[tickets,setTickets]=useState<Ticket[]>([]);
 const [body,setBody]=useState<Settings>(defaults),[version,setVersion]=useState(0),[saved,setSaved]=useState<Settings>(defaults);
 const [grants,setGrants]=useState<Record<string,Record<string,boolean>>>({});
 const [grantDrafts,setGrantDrafts]=useState<Record<string,Record<string,boolean>>>({});
 const [roleDrafts,setRoleDrafts]=useState<Record<string,string>>({});
 const [loaded,setLoaded]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [email,setEmail]=useState(""),[role,setRole]=useState("viewer"),[password,setPassword]=useState("");
 const [secretLink,setSecretLink]=useState(""),[subject,setSubject]=useState(""),[issue,setIssue]=useState(""),[find,setFind]=useState("");
 const dirty=useMemo(()=>JSON.stringify(body)!==JSON.stringify(saved),[body,saved]);
 const latest=useRef({body,version,saved,save:async()=>false,discard:()=>{}});
 const memberRole=(r:string)=>({owner:t("Owner","মালিক"),admin:t("Admin","অ্যাডমিন"),editor:t("Editor","সম্পাদক"),viewer:t("Viewer","দর্শক")} as Record<string,string>)[r]??r;
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(base+"/"+resource+"?environment="+encodeURIComponent(environment),{credentials:"same-origin",cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
   if(!r.ok)throw Error(String(r.status));
   const d=await r.json() as ApiData;
   if(signal?.aborted)return;
   if(resource==="team"){
    if(!Array.isArray(d.members)||!Array.isArray(d.invitations))throw Error("INVALID_TEAM_RESPONSE");
    setMembers(d.members);setInvites(d.invitations);setGrants(d.grants??{});setGrantDrafts({});setRoleDrafts({});
   }else if(resource==="settings"){
    if(!d.body||typeof d.version!=="number")throw Error("INVALID_SETTINGS_RESPONSE");
    const value={...defaults,...d.body};setBody(value);setSaved(value);setVersion(d.version);
   }else{
    if(!Array.isArray(d.items))throw Error("INVALID_SUPPORT_RESPONSE");
    setTickets(d.items);
   }
   setLoaded(true);
  }catch(e){if(!signal?.aborted)setError(t("Unable to load workspace data. Check the connection and retry.","ওয়ার্কস্পেসের তথ্য পাওয়া যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।")+" ("+(e instanceof Error?e.message:"UNKNOWN")+")")}
  finally{if(!signal?.aborted)setLoading(false)}
 },[base,resource,environment,t]);
 useEffect(()=>{const c=new AbortController();void Promise.resolve().then(()=>{if(!c.signal.aborted)return load(c.signal)});return()=>c.abort()},[load]);
 const refresh=()=>{if(resource==="settings"&&dirty&&!window.confirm(t("Discard unsaved settings and reload?","সংরক্ষণ না করা সেটিংস বাদ দিয়ে আবার লোড করবেন?")))return;void load()};
 async function command(action:string,data:Record<string,unknown>,target?:string){
  if(busy)return false;
  setBusy(true);setError("");setNotice("");
  try{
   const sensitive=["change-role","remove-member","grants","transfer-owner"].includes(action);
   if(sensitive&&!password.trim())throw Error("PASSWORD_REQUIRED");
   const path=base+"/"+action+(target?"/"+target:"")+"?environment="+encodeURIComponent(environment);
   const response=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(sensitive?{...data,current_password:password}:data),signal:AbortSignal.timeout(15000)});
   const json=await response.json() as Result;
   if(!response.ok)throw Error(json.error?.code||json.code||String(response.status));
   if(json.invitation_token){
    setSecretLink(window.location.origin+"/"+locale+"/invite/"+json.invitation_token);
   }
   setPassword("");
   if(action==="settings"){
    const next=formatSettings(data.body as Settings);
    setSaved(next);setBody(next);setVersion(current=>current+1);
   }
   setNotice(t("Changes saved.","পরিবর্তন সংরক্ষণ হয়েছে।"));
   if(action!=="settings")await load();
   if(action==="settings"||action==="transfer-owner")router.refresh();
   return true;
  }catch(e){setError(t("Action not confirmed.","পরিবর্তন নিশ্চিত হয়নি।")+" "+(e instanceof Error?e.message:""));return false}
  finally{setBusy(false)}
 }
 const saveSettings=async()=>{
  if(!canManage||busy)return false;
  const next=formatSettings(latest.current.body);
  if(next.name.length>0&&(next.name.length<2||next.name.length>120)){setError(t("Business name must be 2–120 characters.","ব্যবসার নাম ২–১২০ অক্ষরের হতে হবে।"));return false}
  for(const k of ["logo_url","support_url","legal_url"] as const)if(next[k]&&!isHttps(next[k])){setError(t("Use a valid HTTPS URL.","সঠিক HTTPS URL দিন।"));return false}
  for(const k of ["support_email","notification_email"] as const)if(next[k]&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next[k])){setError(t("Enter a valid email address.","সঠিক ইমেইল ঠিকানা দিন।"));return false}
  if(Object.values(next).some(v=>v.length>500||/[\r\n\x00]/.test(v))){setError(t("A field contains unsupported characters or is too long.","কোনো ফিল্ডে ভুল অক্ষর আছে অথবা সীমা ছাড়িয়েছে।"));return false}
  return command("settings",{body:next,expected_version:latest.current.version});
 };
 useEffect(()=>{latest.current={body,version,saved,save:saveSettings,discard:()=>{setBody({...latest.current.saved});setError("")}}});
 useEffect(()=>{if(resource!=="settings"||!canManage)return;return registerDraft({id:"workspace-settings:"+workspaceId+":"+environment,isDirty:()=>JSON.stringify(latest.current.body)!==JSON.stringify(latest.current.saved),save:()=>latest.current.save(),discard:()=>latest.current.discard()})},[resource,workspaceId,environment,canManage]);
 async function invite(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(await command("invite",{email:email.trim().toLowerCase(),role})){setEmail("");setRole("viewer")}}
 async function support(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(await command("help",{subject:subject.trim(),message:issue.trim()})){setSubject("");setIssue("")}}
 const visible=members.filter(member=>(member.name+" "+(member.email??"")+" "+member.role).toLowerCase().includes(find.trim().toLowerCase()));
 const resourceTitle=resource==="team"?t("Team & access","টিম ও অনুমতি"):resource==="settings"?t("Workspace settings","ওয়ার্কস্পেস সেটিংস"):t("Help & feedback","সহায়তা ও মতামত");
 return <div className="ws-workbench" aria-busy={busy}>
  <header className="ws-page-head"><div><h1>{resourceTitle}</h1><p>{resource==="team"?t("People and permissions for this business.","এই ব্যবসার সদস্য ও তাদের অনুমতি।"):resource==="settings"?t("Business identity, checkout branding and customer contact.","ব্যবসার পরিচয়, চেকআউট ও যোগাযোগ।"):t("Contact support and follow your submitted requests.","সহায়তার অনুরোধ পাঠান ও অগ্রগতি দেখুন।")}</p></div><button type="button" className="ws-refresh" disabled={busy||loading} onClick={refresh}>{t("Refresh","রিফ্রেশ")}</button></header>
  {error&&<div className="ws-alert" role="alert"><span>{error}</span><button type="button" onClick={refresh} disabled={busy}>{t("Retry","আবার চেষ্টা")}</button></div>}
  {notice&&<p data-feedback="success" className="ws-note" role="status">{notice}</p>}
  {loading?<div className="ws-loading" role="status">{t("Loading workspace…","ওয়ার্কস্পেস লোড হচ্ছে…")}</div>:!loaded?<p className="ws-empty" role="status">{t("Workspace data is unavailable. Try Refresh.","ওয়ার্কস্পেসের তথ্য পাওয়া যায়নি। রিফ্রেশ করুন।")}</p>:<>
   {resource==="team"&&<>
    <div className="ws-stat-strip"><div><span>{t("Active members","সক্রিয় সদস্য")}</span><strong>{members.length}</strong></div><div><span>{t("Open invitations","অপেক্ষমাণ আমন্ত্রণ")}</span><strong>{invites.length}</strong></div><div><span>{t("Your access","আপনার অনুমতি")}</span><strong>{isOwner?t("Owner","মালিক"):canManage?t("Admin","অ্যাডমিন"):t("Member","সদস্য")}</strong></div></div>
    <div className="ws-two-col">
     <section className="ws-card ws-members"><div className="ws-section-heading"><div><h2>{t("Members","সদস্য")}</h2><p>{t("Access is controlled by the server for every action.","প্রতিটি কাজের অনুমতি সার্ভারে যাচাই হয়।")}</p></div><label className="ws-member-search"><span className="sr-only">{t("Filter members","সদস্য খুঁজুন")}</span><input value={find} onChange={e=>setFind(e.target.value)} placeholder={t("Find member","সদস্য খুঁজুন")}/></label></div>
      {!visible.length?<p className="ws-empty">{find?t("No matching members.","মেলে এমন সদস্য নেই।"):t("No membership records available.","সদস্যের রেকর্ড পাওয়া যায়নি।")}</p>:<div className="ws-member-list">{visible.map(member=>{
       const editable=canManage&&member.id!==userId&&(isOwner||!["owner","admin"].includes(member.role));
       const nextRole=roleDrafts[member.id]??member.role,grantEdits=grantDrafts[member.id]??{};
       return <article className="ws-member" key={member.id}>
        <div className="ws-member-top"><span className="ws-member-avatar" aria-hidden="true">{(member.name||member.email||"?").slice(0,1).toUpperCase()}</span><div><strong>{member.name||member.email||t("Member","সদস্য")}</strong><small>{member.email||t("Email hidden by role","ইমেইল দেখার অনুমতি নেই")}</small></div><span className="ws-role">{memberRole(member.role)}</span></div>
        {editable&&<div className="ws-member-actions"><label>{t("Role","দায়িত্ব")}<select value={nextRole} disabled={busy} onChange={e=>setRoleDrafts(d=>({...d,[member.id]:e.target.value}))}>{(isOwner?["admin","editor","viewer"]:["editor","viewer"]).map(value=><option key={value} value={value}>{memberRole(value)}</option>)}</select></label>
         <button type="button" disabled={busy||nextRole===member.role||!password} onClick={()=>{if(window.confirm(t("Change this member's access?","এই সদস্যের অনুমতি বদলাবেন?")))void command("change-role",{role:nextRole},member.id)}}>{t("Save role","দায়িত্ব সংরক্ষণ")}</button>
         <button type="button" disabled={busy||!password} onClick={()=>{if(window.confirm(t("Remove this person's access to the workspace?","এই ব্যক্তির ওয়ার্কস্পেস অনুমতি সরাবেন?")))void command("remove-member",{},member.id)}}>{t("Remove","সরান")}</button>
        </div>}
        {isOwner&&member.id!==userId&&member.role!=="owner"&&<details className="ws-member-permissions"><summary>{t("Permission overrides","বিশেষ অনুমতি")}</summary><div className="ws-grants-grid">{caps.map(([key,en,bengali])=><label key={key}><input disabled={busy} type="checkbox" checked={grantEdits[key]??(grants[member.id]?.[key]!==false)} onChange={e=>setGrantDrafts(state=>({...state,[member.id]:{...(state[member.id]??{}),[key]:e.target.checked}}))}/><span>{bn?bengali:en}</span></label>)}</div><p>{t("Overrides do not grant capabilities outside the member's role.","দায়িত্বের বাইরে নতুন অনুমতি দেওয়া হবে না।")}</p><button disabled={busy||!password||Object.keys(grantEdits).length===0} onClick={()=>void command("grants",grantEdits,member.id)} type="button">{t("Save permissions","অনুমতি সংরক্ষণ")}</button>
         <button disabled={busy||!password} type="button" className="ws-danger" onClick={()=>{if(window.confirm(t("Transfer ownership? You will become an admin. This cannot be undone from this screen.","মালিকানা হস্তান্তর করবেন? আপনি অ্যাডমিন হয়ে যাবেন।")))void command("transfer-owner",{},member.id)}}>{t("Transfer ownership","মালিকানা হস্তান্তর")}</button>
        </details>}
       </article>
      })}</div>}
     </section>
     <div className="ws-sidebar-col">
      {canManage&&<section className="ws-card"><h2>{t("Invite teammate","সহকর্মী আমন্ত্রণ")}</h2><p className="ws-muted">{t("An invitation link is generated for private sharing. No email is sent automatically.","শেয়ার করার জন্য গোপন আমন্ত্রণ লিংক তৈরি হবে। স্বয়ংক্রিয় ইমেইল যাবে না।")}</p><form onSubmit={invite} className="ws-form"><label>{t("Email address","ইমেইল")}<input type="email" required maxLength={254} value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/></label><label>{t("Role","দায়িত্ব")}<select value={role} disabled={busy} onChange={e=>setRole(e.target.value)}>{(isOwner?["admin","editor","viewer"]:["editor","viewer"]).map(value=><option value={value} key={value}>{memberRole(value)}</option>)}</select></label><button className="ws-primary" disabled={busy||!email.trim()} type="submit">{t("Create invitation","আমন্ত্রণ তৈরি")}</button></form></section>}
      {secretLink&&<section className="ws-card ws-secret"><h2>{t("Invitation link — show once","আমন্ত্রণ লিংক — একবার দেখুন")}</h2><p>{t("Share only with the intended person. Email identity is checked again when accepting.","শুধু নির্দিষ্ট ব্যক্তিকে পাঠান। গ্রহণের সময় ইমেইল আবার যাচাই হবে।")}</p><input readOnly value={secretLink} aria-label={t("One-time invitation link","আমন্ত্রণ লিংক")}/><div className="ws-row"><button type="button" onClick={()=>void navigator.clipboard.writeText(secretLink).then(()=>setNotice(t("Link copied.","লিংক কপি হয়েছে।"))).catch(()=>setError(t("Copy failed. Select the link manually.","কপি হয়নি, লিংকটি নির্বাচন করুন।")))}>{t("Copy link","কপি করুন")}</button><button type="button" onClick={()=>setSecretLink("")}>{t("Dismiss","বন্ধ করুন")}</button></div></section>}
      {canManage&&<section className="ws-card"><h2>{t("Confirm sensitive changes","গুরুত্বপূর্ণ পরিবর্তন নিশ্চিত করুন")}</h2><p className="ws-muted">{t("Enter your current password before changing roles, removing members or transferring ownership.","সদস্যের দায়িত্ব, অনুমতি বা মালিকানা বদলানোর আগে বর্তমান পাসওয়ার্ড দিন।")}</p><label className="ws-form">{t("Current password","বর্তমান পাসওয়ার্ড")}<input type="password" autoComplete="current-password" value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></label></section>}
      <section className="ws-card"><h2>{t("Pending invitations","অপেক্ষমাণ আমন্ত্রণ")}</h2>{!invites.length?<p className="ws-empty">{t("No pending invitations.","কোনো অপেক্ষমাণ আমন্ত্রণ নেই।")}</p>:<div className="ws-invites">{invites.map(inv=><div key={inv.id}><div><strong>{inv.email}</strong><small>{memberRole(inv.role)} · {t("Expires","মেয়াদ")} {at(inv.expires_at,locale)}</small></div>{canManage&&<div className="ws-row"><button disabled={busy} type="button" onClick={()=>void command("resend-invite",{},inv.id)}>{t("Renew link","লিংক নবায়ন")}</button><button type="button" disabled={busy} onClick={()=>{if(window.confirm(t("Revoke this invitation?","এই আমন্ত্রণ বাতিল করবেন?")))void command("revoke-invite",{},inv.id)}}>{t("Revoke","বাতিল")}</button></div>}</div>)}</div>}</section>
     </div>
    </div>
   </>}
   {resource==="settings"&&<nav className="ref-settings-categories" aria-label={t("Settings categories","সেটিংস বিভাগ")}>
 {[['business-profile',t("Business identity","ব্যবসার পরিচয়"),t("Name and checkout presentation","নাম ও চেকআউটের পরিচয়"),'◈'],['customer-contact',t("Contact & policies","যোগাযোগ ও নীতিমালা"),t("Support, notices and legal links","সহায়তা, নোটিশ ও শর্তাবলি"),'↗'],['language-region',t("Language & region","ভাষা ও অঞ্চল"),t("Checkout language and timezone","চেকআউটের ভাষা ও সময়"),'◎'],...(isOwner?[['privacy-data',t("Privacy & data","গোপনীয়তা ও তথ্য"),t("Workspace data requests","ওয়ার্কস্পেসের তথ্যের অনুরোধ"),'◇']]:[])].map(([id,title,description,icon])=><a key={id} href={"#"+id}><span aria-hidden="true">{icon}</span><div><strong>{title}</strong><small>{description}</small></div><b aria-hidden="true">↗</b></a>)}
 </nav>}
 {resource==="settings"&&<div className="ws-two-col ws-settings-layout"><div className="ws-sidebar-col">
    <section className="ws-card" id="business-profile"><div className="ws-section-heading"><div><h2>{t("Business profile","ব্যবসার পরিচয়")}</h2><p>{t("What customers see at checkout.","চেকআউটে গ্রাহক যা দেখবেন।")}</p></div></div>
     <div className="ws-form ws-settings-grid">{(["name","checkout_title","checkout_description","logo_url"] as const).map(k=><label key={k}>{fields[k][bn?1:0]}<input disabled={!canManage||busy} value={body[k]} maxLength={500} onChange={e=>setBody(v=>({...v,[k]:e.target.value}))} placeholder={k==="logo_url"?"https://":undefined}/></label>)}</div>
    </section>
    <section className="ws-card" id="customer-contact"><h2>{t("Customer contact","গ্রাহকের যোগাযোগ")}</h2><div className="ws-form ws-settings-grid">{(["support_email","notification_email","support_url","legal_url"] as const).map(k=><label key={k}>{fields[k][bn?1:0]}<input type={k.endsWith("_email")?"email":"url"} disabled={!canManage||busy} value={body[k]} maxLength={500} onChange={e=>setBody(v=>({...v,[k]:e.target.value}))} placeholder={k.endsWith("_url")?"https://":undefined}/></label>)}</div></section>
   </div><div className="ws-sidebar-col">
    <section className="ws-card" id="language-region"><h2>{t("Language & region","ভাষা ও অঞ্চল")}</h2><div className="ws-form"><label>{fields.locale[bn?1:0]}<select value={body.locale} disabled={!canManage||busy} onChange={e=>setBody(v=>({...v,locale:e.target.value}))}><option value="bn">বাংলা</option><option value="en">English</option></select></label><label>{fields.timezone[bn?1:0]}<input value={body.timezone} disabled={!canManage||busy} maxLength={120} onChange={e=>setBody(v=>({...v,timezone:e.target.value}))} list="ws-common-timezones"/><datalist id="ws-common-timezones"><option value="Asia/Dhaka"/><option value="UTC"/><option value="Asia/Kolkata"/></datalist></label></div></section>
    {canManage&&<section className="ws-card ws-sticky-actions"><h2>{t("Save your changes","পরিবর্তন সংরক্ষণ")}</h2><p className="ws-muted">{dirty?t("You have unsaved settings.","সংরক্ষণ না করা পরিবর্তন আছে।"):t("All changes are saved.","সব পরিবর্তন সংরক্ষিত আছে।")}</p><div className="ws-row"><button className="ws-primary" disabled={busy||loading||!dirty} type="button" onClick={()=>void saveSettings()}>{busy?t("Saving…","সংরক্ষণ হচ্ছে…"):t("Save settings","সেটিংস সংরক্ষণ")}</button><button type="button" disabled={busy||!dirty} onClick={()=>latest.current.discard()}>{t("Discard","বাতিল")}</button></div></section>}
    {isOwner&&<section className="ws-card" id="privacy-data"><h2>{t("Privacy & data","গোপনীয়তা ও তথ্য")}</h2><PaymentPrivacy locale={locale} workspaceId={workspaceId}/></section>}
   </div></div>}
   {resource==="help"&&<div className="ws-two-col ws-help-layout"><section className="ws-card"><h2>{t("Request support","সহায়তা চান")}</h2><p className="ws-muted">{t("Please do not include passwords, API keys, full payment SMS or other secrets.","পাসওয়ার্ড, API key বা সম্পূর্ণ পেমেন্ট SMS শেয়ার করবেন না।")}</p><form className="ws-form" onSubmit={support}><label>{t("Subject","বিষয়")}<input required minLength={3} maxLength={160} disabled={busy} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>{t("Describe the issue","সমস্যা লিখুন")}<textarea required rows={6} minLength={10} maxLength={4000} disabled={busy} value={issue} onChange={e=>setIssue(e.target.value)}/></label><button className="ws-primary" type="submit" disabled={busy||subject.trim().length<3||issue.trim().length<10}>{t("Submit request","অনুরোধ পাঠান")}</button></form></section>
    <section className="ws-card"><h2>{t("Your support requests","আপনার সহায়তার অনুরোধ")}</h2>{!tickets.length?<div className="ws-empty">{t("No support requests yet.","এখনো কোনো সহায়তার অনুরোধ নেই।")}</div>:<div className="ws-tickets">{tickets.map(ticket=><article key={ticket.id}><div className="ws-ticket-head"><strong>{ticket.subject}</strong><span>{ticket.status}</span></div><time>{at(ticket.created_at,locale)}</time><p>{ticket.message}</p>{!!ticket.replies?.length&&<details><summary>{t("Replies","উত্তর")} ({ticket.replies.length})</summary>{ticket.replies.map((reply,i)=><blockquote key={i}><p>{reply.message}</p><time>{at(reply.created_at,locale)}</time></blockquote>)}</details>}</article>)}</div>}</section>
   </div>}
  </>}
 </div>;
}
