"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import type {Locale,PaymentEnvironment} from "../lib/dashboard-navigation";

type Day={date:string;verified_minor:number};
type Overview={verified_minor:number;pending_requests:number;unmatched_receipts:number;online_devices:number;failed_deliveries:number;daily_volume:Day[]};
type Recent={id:string;merchant_reference:string;verified_amount_minor:number;verified_at:string;webhook_status?:string};
const metrics:[keyof Overview,string,string,string][]=[
 ["verified_minor","Verified volume","যাচাইকৃত টাকা","payments"],
 ["pending_requests","Pending requests","অপেক্ষমাণ রিকোয়েস্ট","requests"],
 ["unmatched_receipts","Receipt exceptions","Receipt সমস্যা","incoming"],
 ["online_devices","Online legacy sources","পুরোনো সংযুক্ত সোর্স","devices"],
 ["failed_deliveries","Failed webhooks","ব্যর্থ ওয়বহুক","webhooks"]
];
export function PaymentOverview({locale,workspaceId,environment}:{locale:Locale;workspaceId:string;environment:PaymentEnvironment}){
 const bn=locale==="bn";
 const [data,setData]=useState<Overview|null>(null),[recent,setRecent]=useState<Recent[]>([]);
 const [error,setError]=useState(""),[recentError,setRecentError]=useState(""),[loading,setLoading]=useState(true),[generation,setGeneration]=useState(0);
 const root="/"+locale+"/w/"+workspaceId+"/payments";
 const href=(section:string,id="")=>root+"/"+section+(id?"/"+id:"")+"?env="+environment;
 const money=(n:number)=>new Intl.NumberFormat(bn?"bn-BD":"en-BD",{style:"currency",currency:"BDT"}).format(n/100);
 const time=(value:string)=>new Date(value).toLocaleString(bn?"bn-BD":"en-BD",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"});
 useEffect(()=>{
  const controller=new AbortController(),query="?environment="+environment;
  const read=async(kind:string)=>{
   const response=await fetch("/api/go/workspaces/"+workspaceId+"/operations/"+kind+query,{cache:"no-store",signal:controller.signal});
   const payload=await response.json();
   if(!response.ok)throw Error(response.status===403?(bn?"অনুমতি নেই।":"Access denied."):response.status===401?(bn?"আবার লগইন করুন।":"Sign in again."):response.status===503?(bn?"ডেটার উৎস unavailable—শূন্য totals নয়।":"Source unavailable—not zero totals."):payload.error?.code||"Source read failed");
   if(!Array.isArray(payload.items))throw Error(bn?"উৎসের ডেটা ভুল।":"Source returned invalid data.");
   return payload.items;
  };
  let active=true;
  void Promise.resolve().then(()=>{if(active){setLoading(true);setError("");setRecentError("");setData(null);setRecent([])}});
  void read("overview").then(values=>{if(active)setData((values[0]||null) as Overview|null)}).catch(e=>{if(active&&!controller.signal.aborted)setError(e instanceof Error?e.message:"Source unavailable")}).finally(()=>{if(active)setLoading(false)});
  void read("payments").then(values=>{if(active)setRecent(values.slice(0,6) as Recent[])}).catch(e=>{if(active&&!controller.signal.aborted)setRecentError(e instanceof Error?e.message:"Recent payments unavailable")});
  return()=>{active=false;controller.abort()};
 },[workspaceId,environment,bn,generation]);
 const volume=data?.daily_volume||[],peak=Math.max(1,...volume.map(d=>Number(d.verified_minor)||0));
 return <div className="pg09-overview">
  <div className="pg-operation-overview-actions">
   <p>{environment==="sandbox"?(bn?"Sandbox · আসল টাকা পাঠাবেন না":"Sandbox · do not send real money"):(bn?"Live · শুধু সংযুক্ত উৎসের তথ্য":"Live · only connected source data")}</p>
   <button disabled={loading} onClick={()=>setGeneration(n=>n+1)}>{bn?"আপডেট":"Refresh"}</button>
   <Link href={href("requests")}>{bn?"পেমেন্ট রিকোয়েস্ট":"Payment requests"}</Link>
  </div>
  {error?<div role="alert" className="pg-operation-error"><p>{error}</p><button onClick={()=>setGeneration(n=>n+1)}>{bn?"আবার চেষ্টা":"Retry"}</button></div>:
   <div className="ds-metrics" aria-busy={loading}>
    {metrics.map(([key,en,bengali,section])=><Link className="pg09-metric-link" key={key} href={href(section)}>
     <article><span>{bn?bengali:en}</span><strong>{data?(key==="verified_minor"?money(Number(data[key])):new Intl.NumberFormat(bn?"bn-BD":"en-BD").format(Number(data[key]))):"—"}</strong>
      <small>{data?(bn?"এই পরিবেশের server data":"Server data for this environment"):(bn?"লোড হচ্ছে…":"Loading…")}</small></article>
    </Link>)}
   </div>}
  {data&&<section className="ds-panel pg09-volume-panel" aria-label={bn?"সাত দিনের যাচাইকৃত টাকা":"Seven-day verified volume"}>
   <div className="ds-panel-heading"><h2>{bn?"গত ৭ দিনের যাচাইকৃত পেমেন্ট":"Verified volume · last 7 days"}</h2><span>{bn?"ঢাকা সময় · settlement নয়":"Dhaka time · not settlement"}</span></div>
   {volume.length===0?<p>{bn?"দিনভিত্তিক তথ্য নেই।":"Daily data unavailable."}</p>:<>
    <div className="pg09-volume-bars" aria-hidden="true">{volume.map(day=><div className="pg09-volume-bar-slot" key={day.date}><div style={{height:Math.max(3,Number(day.verified_minor)/peak*100)+"%"}}/><span>{day.date.slice(5)}</span></div>)}</div>
    <div className="pg-operation-table"><table><caption>{bn?"সার্ভারে যাচাইকৃত দৈনিক পেমেন্ট":"Accessible daily verified-payment totals"}</caption><thead><tr><th scope="col">{bn?"তারিখ":"Date"}</th><th scope="col">{bn?"যাচাইকৃত":"Verified"}</th></tr></thead><tbody>{volume.map(day=><tr key={day.date}><td>{day.date}</td><td>{money(Number(day.verified_minor))}</td></tr>)}</tbody></table></div>
   </>}
  </section>}
  <section className="ds-panel pg09-recent-payments">
   <div className="ds-panel-heading"><h2>{bn?"সাম্প্রতিক যাচাইকৃত পেমেন্ট":"Recent verified payments"}</h2><Link href={href("payments")}>{bn?"সব দেখুন":"View all"}</Link></div>
   {recentError?<p role="alert">{recentError} <button onClick={()=>setGeneration(n=>n+1)}>{bn?"আবার চেষ্টা":"Retry"}</button></p>:
    recent.length===0?<p>{loading?(bn?"লোড হচ্ছে…":"Loading…"):(bn?"এখনো যাচাইকৃত পেমেন্ট নেই।":"No verified payments yet.")}</p>:
    <div className="pg-operation-table"><table><thead><tr><th>{bn?"রেফারেন্স":"Reference"}</th><th>{bn?"পরিমাণ":"Amount"}</th><th>{bn?"যাচাইয়ের সময়":"Verified at"}</th><th>{bn?"ওয়েবহুক":"Webhook"}</th></tr></thead><tbody>{recent.map(p=><tr key={p.id}><td><Link href={href("payments",p.id)}>{p.merchant_reference}</Link></td><td>{money(p.verified_amount_minor)}</td><td>{time(p.verified_at)}</td><td>{p.webhook_status||"—"}</td></tr>)}</tbody></table></div>}
  </section>
  {data&&<section className="ds-panel" aria-label={bn?"যে কাজগুলো খেয়াল করা প্রয়োজন":"Operational attention"}>
   <div className="ds-panel-heading"><h2>{bn?"যে কাজগুলো খেয়াল করা প্রয়োজন":"Needs your attention"}</h2></div>
   <div className="pg09-quick-links">
    {data.unmatched_receipts>0&&<Link href={href("incoming")}>{bn?`${data.unmatched_receipts}টি receipt-এর অমিল যাচাই করুন`:`Review ${data.unmatched_receipts} receipt exceptions`}</Link>}
    {data.failed_deliveries>0&&<Link href={href("webhooks")}>{bn?`${data.failed_deliveries}টি failed webhook দেখুন`:`Investigate ${data.failed_deliveries} failed webhooks`}</Link>}
    {data.pending_requests>0&&<Link href={href("requests")}>{bn?`${data.pending_requests}টি অপেক্ষমাণ request দেখুন`:`Review ${data.pending_requests} pending requests`}</Link>}
    {data.online_devices===0&&<Link href={href("devices")}>{bn?"সংযুক্ত ফোনের heartbeat যাচাই করুন":"Check paired-phone connection and heartbeat"}</Link>}
   </div>
   {data.unmatched_receipts===0&&data.failed_deliveries===0&&data.pending_requests===0&&data.online_devices>0&&
     <p>{bn?"বর্তমান সারাংশে জরুরি receipt বা webhook সমস্যা নেই।":"No receipt exceptions or failed webhooks in the current overview."}</p>}
   <small>{bn?"ফোনের প্রকৃত অবস্থা SMS devices পেজে দেখুন; পুরোনো সোর্সের সংখ্যা physical-phone count নয়।":"Check actual handset status in SMS devices; the legacy-source metric is not a physical-phone count."}</small>
  </section>}
  <section className="ds-panel">
   <h2>{bn?"যাচাই ও সেটআপ":"Verification and setup"}</h2>
   <p>{bn?"সার্ভার প্রেরকের পূর্ণ নম্বর, provider, সঠিক পরিমাণ ও মূল লেনদেনের সময় এককভাবে মিলিয়ে পেমেন্ট যাচাই করে। SMS গ্রহণকারী SIM/নম্বর মেলানোর শর্ত নয়। Offline থাকলে SMS পাঠাতে দেরি হতে পারে।":"The server matches provider, full payer number, exact amount and original transaction time to one active attempt. SIM or receiving-number matching is not required. Offline forwarding may delay verification."}</p>
   <nav className="pg09-quick-links" aria-label={bn?"পেমেন্ট পরিচালনা":"Payment operations"}>{(["requests","incoming","gateways","devices","webhooks","events"] as const).map(section=><Link key={section} href={href(section)}>{({requests:bn?"রিকোয়েস্ট":"Requests",incoming:bn?"ইনকামিং":"Incoming",gateways:bn?"গ্রহণকারী অ্যাকাউন্ট":"Receiving accounts",devices:bn?"ডিভাইস":"Devices",webhooks:bn?"ওয়েবহুক":"Webhooks",events:bn?"ইভেন্ট":"Events"})[section]}</Link>)}</nav>
  </section>
 </div>;
}