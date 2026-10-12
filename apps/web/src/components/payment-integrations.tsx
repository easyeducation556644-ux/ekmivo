"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {registerDraft} from "../lib/client/draft-navigation";
import {PaymentLoadingSkeleton} from "./payment-loading-skeleton";
type Connection={id:string;kind:string;name:string;origin:string;webhook_id:string|null;status:string;version:number;diagnostics?:{endpoint_configured:boolean;endpoint_active:boolean;rotation_pending:boolean;delivered_events:number;failed_events:number;latest_delivery_at:string|null}};
type Source={method:string;source:string;parser_id:string;version:number};
type Account={id:string;method:string;display_suffix:string;source_status:string};
const blank={name:"",origin:"",kind:"website",webhook_id:""};
export function PaymentIntegrations({locale,workspaceId,environment,canManage}:{locale:"en"|"bn";workspaceId:string;environment:string;canManage:boolean}){
 const bn=locale==="bn",t=(en:string,bengali:string)=>bn?bengali:en,base=`/api/go/workspaces/${workspaceId}/integrations`;
 const href=(section:string)=>`/${locale}/w/${workspaceId}/payments/${section}?env=${environment}`;
 const [receiving,setReceiving]=useState<Account[]>([]),[sources,setSources]=useState<Source[]>([]),[rows,setRows]=useState<Connection[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[form,setForm]=useState(blank),[editing,setEditing]=useState<Connection|null>(null),[dirty,setDirty]=useState(false);
 const draft=useRef({dirty:false,save:async()=>false,discard:()=>{}});
 const load=useCallback(async(signal?:AbortSignal)=>{setLoading(true);try{const r=await fetch(`${base}?environment=${environment}`,{cache:"no-store",signal});if(!r.ok)throw Error();const d=await r.json();if(signal?.aborted)return;setRows(d.items);setSources(d.approved_sources??[]);setReceiving(d.receiving?.items??[]);setError("")}catch{if(!signal?.aborted)setError(bn?"সংযোগের তথ্য পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।":"Connections unavailable. Please retry.")}finally{if(!signal?.aborted)setLoading(false)}},[base,environment,bn]);
 useEffect(()=>{const c=new AbortController();void Promise.resolve().then(()=>{if(!c.signal.aborted)return load(c.signal)});return()=>c.abort()},[load]);
 async function command(path:string,body:unknown){if(busy)return false;setBusy(true);setError("");setNotice("");try{const r=await fetch(`${base}${path}?environment=${environment}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw Error();setNotice(t("Configuration saved. This does not certify a live integration.","সেটিং সংরক্ষিত হয়েছে। এটি live integration পরীক্ষার প্রমাণ নয়।"));await load();return true}catch{setError(t("Change unconfirmed. Refresh before changing it again; retry the same configuration if needed.","পরিবর্তন নিশ্চিত হয়নি। আবার পরিবর্তনের আগে refresh করুন; প্রয়োজনে একই সেটিং আবার পাঠান।"));return false}finally{setBusy(false)}}
 async function save(){const ok=await command(editing?`/${editing.id}/edit`:"",{...form,webhook_id:form.webhook_id||undefined,expected_version:editing?.version});if(ok){draft.current.dirty=false;setDirty(false);setEditing(null);setForm(blank)}return ok}
 useEffect(()=>{draft.current={dirty,save,discard:()=>{draft.current.dirty=false;setDirty(false);setEditing(null);setForm(blank)}}});
 useEffect(()=>registerDraft({id:`integrations:${workspaceId}:${environment}`,isDirty:()=>draft.current.dirty,save:()=>draft.current.save(),discard:()=>draft.current.discard()}),[workspaceId,environment]);
 function edit(row:Connection){if(dirty&&!window.confirm(t("Discard the current draft?","বর্তমান draft বাদ দেবেন?")))return;setEditing(row);setForm({kind:row.kind,name:row.name,origin:row.origin,webhook_id:row.webhook_id??""});setDirty(false)}
 function change(key:keyof typeof blank,value:string){setForm(f=>({...f,[key]:value}));setDirty(true)}
 return <div className="pg10-workspace">
  <p>{t("Connect your website or store through hosted checkout and signed webhooks. Keep keys on your server. Configuration and successful delivery are shown separately.","Hosted checkout ও signed webhook দিয়ে website বা store যুক্ত করুন। Key server-এ রাখুন। সেটিং ও সফল delivery আলাদাভাবে দেখানো হয়।")}</p>
  <section className="ds-panel"><h2>{t("Setup","সেটআপ")}</h2><ol>
   <li><Link href={href("gateways")}>{t("Add a receiving account","টাকা গ্রহণের account যোগ করুন")}</Link></li>
   <li><Link href={href("devices")}>{t("Pair the phone and bind its receipt source","ফোন pair করে receipt source সেট করুন")}</Link></li>
   <li><Link href={href("developers")}>{t("Create a server API key and follow your connector guide","Server API key তৈরি করে connector guide অনুসরণ করুন")}</Link></li>
   <li><Link href={href("webhooks")}>{t("Configure a signed webhook receiver","Signed webhook receiver সেট করুন")}</Link></li>
   <li><Link href={href("events")}>{t("Inspect a sandbox payment and delivery before going Live","Live চালুর আগে sandbox payment ও delivery দেখুন")}</Link></li>
  </ol><p>{t("Default bKash/Nagad/Rocket phone verification does not require an official gateway API. The SMS/app source identifies the receipt sender; the actual payer comes from its contents.","Default bKash/Nagad/Rocket phone verification-এর জন্য official gateway API লাগে না। SMS/app source receipt-এর উৎস; প্রকৃত payer receipt-এর ভিতরের নম্বর।")}</p></section>
  {loading?<PaymentLoadingSkeleton locale={locale}/>:<section className="ds-panel"><h2>{t("Receiving sources","টাকা গ্রহণের source")}</h2>{receiving.length===0&&!error?<p>{t("Add a receiving account to start.","শুরু করতে receiving account যোগ করুন।")}</p>:<ul>{receiving.map(a=><li key={a.id}>{a.method} · ••••{a.display_suffix} · {a.source_status==="receiving_source_online"?t("Phone online","ফোন online"):a.source_status==="disabled"?t("Disabled","বন্ধ"):a.source_status==="sandbox_fixture"?t("Sandbox fixture","পরীক্ষামূলক fixture"):t("Source or permissions need attention","Source বা permission যাচাই প্রয়োজন")}</li>)}</ul>}<details><summary>{t("Available receipt parsers","উপলব্ধ receipt parser")}</summary><ul>{sources.map(s=><li key={s.parser_id}>{s.method} · {s.source} · {s.parser_id} v{s.version}</li>)}</ul>{sources.length===0&&!error&&<p>{t("No approved receipt parser available.","Approved receipt parser নেই।")}</p>}</details></section>}
  {canManage&&<form className="ds-panel pg10-form" onSubmit={e=>{e.preventDefault();void save()}}><h2>{editing?t("Edit connection","সংযোগ পরিবর্তন"):t("Add connection","সংযোগ যোগ করুন")}</h2>
   <label>{t("Name","নাম")}<input required minLength={2} maxLength={120} disabled={busy} value={form.name} onChange={e=>change("name",e.target.value)}/></label>
   <label>{t("Connector","সংযোগের ধরন")}<select disabled={busy} value={form.kind} onChange={e=>change("kind",e.target.value)}>{["website","custom-bot","woocommerce","shopify"].map(k=><option key={k} value={k}>{k}</option>)}</select></label>
   <label>{t("HTTPS site origin","HTTPS site origin")}<input type="url" required disabled={busy} placeholder="https://your-store.example" value={form.origin} onChange={e=>change("origin",e.target.value)}/></label>
   <label>{t("Webhook endpoint ID (optional)","Webhook endpoint ID (ঐচ্ছিক)")}<input disabled={busy} pattern="[0-9a-fA-F-]{36}" value={form.webhook_id} onChange={e=>change("webhook_id",e.target.value)}/></label>
   {form.kind==="shopify"&&<p>{t("Shopify external/manual payment recording needs a supported store capability. This connector never charges or refunds automatically.","Shopify external/manual payment recording-এর জন্য store-এর প্রয়োজনীয় capability থাকতে হবে। এটি নিজে টাকা নেয় বা ফেরত দেয় না।")}</p>}
   <div className="pg10-toolbar"><button disabled={busy||loading}>{t("Save configuration","সেটিং সংরক্ষণ")}</button>{(editing||dirty)&&<button type="button" disabled={busy} onClick={()=>{if(!dirty||window.confirm(t("Discard this draft?","এই draft বাদ দেবেন?")))draft.current.discard()}}>{t("Cancel","বাতিল")}</button>}</div>
  </form>}
  <button disabled={busy||loading} onClick={()=>void load()}>{t("Refresh diagnostics","অবস্থা আবার দেখুন")}</button>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!loading&&!error&&rows.length===0&&<p>{t("No connections configured yet.","এখনও কোনো সংযোগ সেট করা হয়নি।")}</p>}
  {!loading&&!error&&rows.map(row=><article className="ds-panel" key={row.id}><h2>{row.name}</h2><p>{row.kind} · {row.origin}</p><p>{row.status==="disabled"?t("Disabled","বন্ধ"):t("Configured; live acceptance not recorded","সেটিং করা আছে; live acceptance নথিভুক্ত নয়")}</p>
   <dl><dt>{t("Webhook","ওয়েবহুক")}</dt><dd>{!row.diagnostics?.endpoint_configured?t("Not connected","যুক্ত করা হয়নি"):row.diagnostics.endpoint_active?t("Enabled","চালু"):t("Disabled","বন্ধ")}</dd><dt>{t("Delivered events","Delivery হওয়া event")}</dt><dd>{row.diagnostics?.delivered_events??0}</dd><dt>{t("Failed events","ব্যর্থ event")}</dt><dd>{row.diagnostics?.failed_events??0}</dd><dt>{t("Latest delivery result","সর্বশেষ delivery result")}</dt><dd>{row.diagnostics?.latest_delivery_at?new Date(row.diagnostics.latest_delivery_at).toLocaleString(locale):t("No completed delivery","সম্পন্ন delivery নেই")}</dd></dl>
   {row.diagnostics?.rotation_pending&&<p>{t("Webhook key rotation is pending confirmation.","Webhook key rotation নিশ্চিত করা বাকি।")}</p>}
   <Link href={href("developers")}>{t("Setup and API guide","সেটআপ ও API guide")}</Link> · <Link href={href("events")}>{t("Delivery history","Delivery history")}</Link>
   {canManage&&<div className="pg10-toolbar"><button disabled={busy} onClick={()=>edit(row)}>{t("Edit","পরিবর্তন")}</button><button disabled={busy} onClick={()=>void command(`/${row.id}/${row.status==="disabled"?"enable":"disable"}`,{expected_version:row.version})}>{row.status==="disabled"?t("Enable","চালু করুন"):t("Disable","বন্ধ করুন")}</button></div>}
  </article>)}
 </div>;
}
