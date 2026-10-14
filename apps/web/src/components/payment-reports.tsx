"use client";

import {useEffect,useMemo,useState} from "react";
import type {FormEvent} from "react";
import Link from "next/link";
import {DashboardIcon} from "./dashboard-icon";

type Locale="en"|"bn";
type MoneyRow={amount_minor:number;payment_count:number};
type MethodRow=MoneyRow&{method:string};
type AccountRow=MoneyRow&{account_id:string;method:string;display_suffix:string};
type CustomerRow=MoneyRow&{customer_id:string;reference:string;name:string};
type RefundRow={status:string;amount_minor:number;request_count:number};
type DayRow={day:string;amount_minor:number};
type Report={
 verified_gross_minor:number;allocated_minor:number;unallocated_minor:number;payment_count:number;
 seller_reported_returned_minor:number;open_requested_refund_minor:number;refund_request_count:number;
 generated_at:string;methods:MethodRow[];accounts:AccountRow[];customers:CustomerRow[];
 refunds:RefundRow[];statement_links:{amount_minor:number;count:number};daily:DayRow[]
};
type AccountOption={id:string;method:string;display_suffix:string};
type Filters={from:string;to:string;account:string};
type Preset="7"|"30"|"90"|"custom";
type Section="methods"|"accounts"|"customers"|"refunds"|"statements"|"daily";
type ViewState={report:Report;filters:Filters};
type Grain="day"|"week";
type CompareSnapshot={key:string;report:Report;from:string;to:string};
function previousPeriod(filters:Filters):Filters|null{
 const from=Date.parse(filters.from+"T00:00:00Z"),to=Date.parse(filters.to+"T00:00:00Z");
 if(!Number.isFinite(from)||!Number.isFinite(to)||from>to)return null;
 const length=Math.round((to-from)/millis)+1;
 return {from:new Date(from-length*millis).toISOString().slice(0,10),to:new Date(from-millis).toISOString().slice(0,10),account:filters.account};
}
function changePercent(current:number,previous:number):string|null{
 if(!Number.isFinite(current)||!Number.isFinite(previous)||previous===0)return null;
 const change=(current-previous)/Math.abs(previous)*100;
 return (change>0?"+":"")+change.toFixed(1)+"%";
}
function summarizedDays(daily:DayRow[],grain:Grain):{key:string;label:string;amount_minor:number}[]{
 const ordered=[...daily].filter(row=>typeof row.day==="string"&&Number.isFinite(row.amount_minor)&&Number.isFinite(Date.parse(row.day+"T00:00:00Z"))).sort((a,b)=>a.day.localeCompare(b.day));
 if(grain==="day")return ordered.map(row=>({key:row.day,label:row.day.slice(5),amount_minor:row.amount_minor}));
 const anchor=ordered.length?Date.parse(ordered[0].day+"T00:00:00Z"):0;
 const groups=new Map<number,{first:string;last:string;total:number}>();
 for(const row of ordered){
  const bucket=Math.floor((Date.parse(row.day+"T00:00:00Z")-anchor)/(7*millis));
  const group=groups.get(bucket);
  if(group){group.last=row.day;group.total+=row.amount_minor}
  else groups.set(bucket,{first:row.day,last:row.day,total:row.amount_minor});
 }
 return [...groups].map(([bucket,group])=>({key:String(bucket),label:group.first.slice(5)+"–"+group.last.slice(5),amount_minor:group.total}));
}
const sections:Section[]=["methods","accounts","customers","refunds","statements","daily"];
const millis=86400000;
function dhakaToday(){return new Date(Date.now()+6*3600000).toISOString().slice(0,10)}
function startDate(end:string,days:number){return new Date(Date.parse(end+"T00:00:00Z")-(days-1)*millis).toISOString().slice(0,10)}
function defaults():Filters{const end=dhakaToday();return {from:startDate(end,30),to:end,account:""}}
function dateRange(filters:Filters){
 const {from,to}=filters;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to))return null;
 const start=Date.parse(from+"T00:00:00Z"),end=Date.parse(to+"T00:00:00Z");
 if(!Number.isFinite(start)||!Number.isFinite(end)||new Date(start).toISOString().slice(0,10)!==from||new Date(end).toISOString().slice(0,10)!==to||end<start||end-start>365*millis)return null;
 return {start:new Date(from+"T00:00:00+06:00").toISOString(),end:new Date(Date.parse(to+"T00:00:00+06:00")+millis).toISOString()};
}
function isRow(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value)}
function isNumber(value:unknown){return typeof value==="number"&&Number.isFinite(value)}
function validateReport(value:unknown):value is Report{
 if(!isRow(value))return false;
 const numeric=["verified_gross_minor","allocated_minor","unallocated_minor","payment_count","seller_reported_returned_minor","open_requested_refund_minor","refund_request_count"];
 if(!numeric.every(key=>isNumber(value[key])))return false;
 if(typeof value.generated_at!=="string"||!isRow(value.statement_links)||!isNumber(value.statement_links.amount_minor)||!isNumber(value.statement_links.count))return false;
 for(const key of ["methods","accounts","customers","refunds","daily"]){
  if(!Array.isArray(value[key]))return false;
  if(!(value[key] as unknown[]).every(item=>isRow(item)&&isNumber(item.amount_minor)))return false;
 }
 return true;
}
function cash(minor:number,locale:Locale){return new Intl.NumberFormat(locale==="bn"?"bn-BD":"en-BD",{style:"currency",currency:"BDT"}).format(minor/100)}
function numeric(value:number,locale:Locale){return new Intl.NumberFormat(locale==="bn"?"bn-BD":"en-BD").format(value)}
function escapeCSV(value:unknown){
 const raw=String(value??"");
 return '"'+( /^[\s]*[=+\-@\t\r]/.test(raw)?"'"+raw:raw ).replaceAll('"','""')+'"';
}
function exportReport(report:Report,period:Filters){
 const rows:(string|number)[][]=[
  ["section","reference","label","status","amount_minor","count","from","through","currency"],
  ["summary","","verified","",""+report.verified_gross_minor,report.payment_count,period.from,period.to,"BDT"],
  ["summary","","allocated","",report.allocated_minor,"","","","BDT"],
  ["summary","","unallocated","",report.unallocated_minor,"","","","BDT"],
  ["summary","","open_refund","",report.open_requested_refund_minor,report.refund_request_count,"","","BDT"],
  ["summary","","seller_reported_returned","",report.seller_reported_returned_minor,"","","","BDT"],
  ...report.methods.map(r=>["method",r.method,r.method,"",r.amount_minor,r.payment_count,"","","BDT"] as (string|number)[]),
  ...report.accounts.map(r=>["account",r.account_id,r.method+" ••••"+r.display_suffix,"",r.amount_minor,r.payment_count,"","","BDT"] as (string|number)[]),
  ...report.customers.map(r=>["customer",r.customer_id,r.name||r.reference,"",r.amount_minor,r.payment_count,"","","BDT"] as (string|number)[]),
  ...report.refunds.map(r=>["refund","",r.status,r.status,r.amount_minor,r.request_count,"","","BDT"] as (string|number)[]),
  ...report.daily.map(r=>["daily",r.day,r.day+" UTC","",r.amount_minor,"","","","BDT"] as (string|number)[]),
  ["statement","merchant_import","","imported",report.statement_links.amount_minor,report.statement_links.count,"","","BDT"]
 ];
 const csv="\uFEFF"+rows.map(row=>row.map(escapeCSV).join(",")).join("\r\n")+"\r\n";
 const uri=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=uri;a.download="ekmivo-report-"+period.from+"-"+period.to+".csv";document.body.append(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(uri),2000);
}
export function PaymentReports({locale,workspaceId,environment}:{locale:Locale;workspaceId:string;environment:string}){
 const bn=locale==="bn",t=(en:string,bengali:string)=>bn?bengali:en;
 const [draft,setDraft]=useState<Filters>(defaults);
 const [applied,setApplied]=useState<Filters>(defaults);
 const [preset,setPreset]=useState<Preset>("30");
 const [section,setSection]=useState<Section>("methods");
 const [grain,setGrain]=useState<Grain>("week");
 const [compare,setCompare]=useState(false);
 const [previous,setPrevious]=useState<CompareSnapshot|null>(null);
 const [compareLoading,setCompareLoading]=useState(false);
 const [compareError,setCompareError]=useState("");
 const [response,setResponse]=useState<ViewState|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
 const [accounts,setAccounts]=useState<AccountOption[]>([]),[accountError,setAccountError]=useState(false);
 const root="/w/"+workspaceId+"/payments/";
 const applies=draft.from===applied.from&&draft.to===applied.to&&draft.account===applied.account;
 const pending=useMemo(()=>dateRange(draft),[draft]);
 const labels:Record<Section,string>={methods:t("Methods","মাধ্যম"),accounts:t("Accounts","অ্যাকাউন্ট"),customers:t("Customers","গ্রাহক"),refunds:t("Refunds","রিফান্ড"),statements:t("Statements","স্টেটমেন্ট"),daily:t("Daily","দৈনিক")};
 const refundLabels:Record<string,string>={requested:t("Requested","অনুরোধ"),reviewing:t("In review","পর্যালোচনায়"),approved:t("Approved","অনুমোদিত"),rejected:t("Rejected","প্রত্যাখ্যাত"),seller_reported_returned:t("Seller reported returned","বিক্রেতার ফেরত রিপোর্ট"),cancelled:t("Cancelled","বাতিল")};

 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/go/workspaces/"+workspaceId+"/integrations?environment="+encodeURIComponent(environment),{cache:"no-store",signal:controller.signal,credentials:"same-origin"})
   .then(async r=>{if(!r.ok)throw Error(String(r.status));return r.json()})
   .then(data=>{if(controller.signal.aborted)return;const rows=data?.receiving?.items;if(!Array.isArray(rows))throw Error("INVALID_ACCOUNTS");setAccounts(rows.filter((x:unknown)=>isRow(x)&&typeof x.id==="string"&&typeof x.method==="string"&&typeof x.display_suffix==="string"));setAccountError(false)})
   .catch(()=>{if(!controller.signal.aborted)setAccountError(true)});
  return()=>controller.abort();
 },[workspaceId,environment]);

 useEffect(()=>{
  const controller=new AbortController();
  const range=dateRange(applied);
  const run=async()=>{
   setLoading(true);setError("");
   if(!range){setError(t("Select a valid date range, up to 366 days.","সর্বোচ্চ ৩৬৬ দিনের সঠিক তারিখ দিন।"));setLoading(false);return}
   const params=new URLSearchParams({environment,from:range.start,to:range.end});
   if(applied.account)params.set("account",applied.account);
   try{
    const result=await fetch("/api/go/workspaces/"+workspaceId+"/reports?"+params,{cache:"no-store",credentials:"same-origin",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
    if(!result.ok)throw Error(result.status===401?"AUTH":result.status===403?"DENIED":result.status===422?"FILTER":[502,503,504].includes(result.status)?"SOURCE":"HTTP "+result.status);
    const body:unknown=await result.json();
    if(!validateReport(body))throw Error("INVALID_DATA");
    if(controller.signal.aborted)return;
    setResponse({report:body,filters:applied});
   }catch(cause){
    if(controller.signal.aborted)return;
    const code=cause instanceof Error?cause.message:"";
    setError(code==="AUTH"?t("Session expired. Sign in again.","সেশন শেষ। আবার লগইন করুন।"):code==="DENIED"?t("You do not have access to this report.","এই রিপোর্টের অনুমতি নেই।"):code==="FILTER"?t("The selected filters are invalid.","নির্বাচিত ফিল্টার সঠিক নয়।"):code==="SOURCE"?t("Reporting service is temporarily unavailable. Try again shortly.","রিপোর্ট সার্ভিস সাময়িকভাবে পাওয়া যাচ্ছে না। কিছুক্ষণ পরে চেষ্টা করুন।"):t("Report could not be loaded. Try again.","রিপোর্ট লোড করা যায়নি। আবার চেষ্টা করুন।"));
   }finally{if(!controller.signal.aborted)setLoading(false)}
  };
  void run();return()=>controller.abort();
 },[workspaceId,environment,applied,refresh,locale]);

 useEffect(()=>{
  if(!compare||!response||loading||error)return;
  const period=previousPeriod(response.filters);
  if(!period)return;
  const dates=dateRange(period);
  if(!dates)return;
  const key=JSON.stringify([workspaceId,environment,response.filters.from,response.filters.to,response.filters.account,response.report.generated_at]);
  const controller=new AbortController();
  const run=async()=>{
   setCompareLoading(true);setCompareError("");
   const params=new URLSearchParams({environment,from:dates.start,to:dates.end});
   if(period.account)params.set("account",period.account);
   try{
    const result=await fetch("/api/go/workspaces/"+workspaceId+"/reports?"+params,{cache:"no-store",credentials:"same-origin",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
    if(!result.ok)throw Error("HTTP "+result.status);
    const data:unknown=await result.json();
    if(!validateReport(data))throw Error("INVALID_DATA");
    if(!controller.signal.aborted)setPrevious({key,report:data,from:period.from,to:period.to});
   }catch{
    if(!controller.signal.aborted)setCompareError(locale==="bn"?"আগের সময়ের হিসাব আনা যাচ্ছে না।":"Previous-period comparison is unavailable.");
   }finally{if(!controller.signal.aborted)setCompareLoading(false)}
  };
  void run();
  return()=>controller.abort();
 },[compare,response,workspaceId,environment,loading,error,locale]);

 function apply(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!pending){setError(t("Select a valid date range, up to 366 days.","সর্বোচ্চ ৩৬৬ দিনের সঠিক তারিখ দিন।"));return}setError("");setApplied({...draft});setRefresh(n=>n+1)}
 function quick(days:7|30|90){const to=dhakaToday(),from=startDate(to,days);const next={...draft,from,to};setPreset(String(days) as Preset);setDraft(next);setApplied(next);setRefresh(n=>n+1)}
 const displayed=response?.report??null;
 const active=response?.filters??applied;
 const stale=Boolean(response&&(loading||error||!applies||active.from!==applied.from||active.to!==applied.to||active.account!==applied.account));
 const chartRows=useMemo(()=>summarizedDays(displayed?.daily??[],grain),[displayed,grain]);
 const max=Math.max(1,...chartRows.map(x=>Math.max(0,x.amount_minor)));
 const methods=displayed?.methods??[];
 const total=methods.reduce((a,b)=>a+b.amount_minor,0);
 const generated=displayed&&!Number.isNaN(Date.parse(displayed.generated_at))?new Intl.DateTimeFormat(bn?"bn-BD":"en-BD",{timeZone:"Asia/Dhaka",dateStyle:"medium",timeStyle:"short"}).format(new Date(displayed.generated_at)):"";
 const compareKey=response?JSON.stringify([workspaceId,environment,response.filters.from,response.filters.to,response.filters.account,response.report.generated_at]):"";
 const matchedCompare=compare&&previous?.key===compareKey&&!stale?previous:null;
 const avg=displayed&&displayed.payment_count>0?Math.round(displayed.verified_gross_minor/displayed.payment_count):null;
 const delta=matchedCompare&&displayed?changePercent(displayed.verified_gross_minor,matchedCompare.report.verified_gross_minor):null;
 const countDelta=matchedCompare&&displayed?changePercent(displayed.payment_count,matchedCompare.report.payment_count):null;
 const allocatedPercent=displayed&&displayed.verified_gross_minor>0?Math.min(100,Math.max(0,displayed.allocated_minor/displayed.verified_gross_minor*100)):0;
 return <div className="er-reports">
  <header className="er-heading">
   <div><h1>{t("Reports","রিপোর্ট")}</h1><p>{t("Explore trends, compare periods and break down payments.","সময়সীমা তুলনা, পেমেন্টের প্রবণতা ও বিস্তারিত হিসাব বিশ্লেষণ।")}</p></div>
   <div className="er-heading-actions">
    <button type="button" onClick={()=>setRefresh(n=>n+1)} disabled={loading} aria-label={t("Refresh report","রিপোর্ট রিফ্রেশ")}><DashboardIcon name="arrow" width={16} height={16}/> {t("Refresh","রিফ্রেশ")}</button>
    <button type="button" disabled={!displayed||stale} onClick={()=>displayed&&exportReport(displayed,active)}><DashboardIcon name="reports" width={16} height={16}/> {t("Export CSV","CSV ডাউনলোড")}</button>
    <button type="button" disabled={!displayed||stale} onClick={()=>window.print()}>{t("Print","প্রিন্ট")}</button>
   </div>
  </header>
  <section className="er-filter-panel" aria-label={t("Report filters","রিপোর্টের ফিল্টার")}>
   <div className="er-period-buttons" role="group" aria-label={t("Date presets","সময়সীমা")}>
    {([7,30,90] as const).map(days=><button key={days} type="button" aria-pressed={preset===String(days)} onClick={()=>quick(days)}>{days} {t("days","দিন")}</button>)}
    <button type="button" aria-pressed={preset==="custom"} onClick={()=>setPreset("custom")}>{t("Custom","নিজের মতো")}</button>
   </div>
   <form onSubmit={apply} className="er-filter-fields">
    <label><span>{t("From","শুরু")}</span><input type="date" required value={draft.from} onChange={e=>{setPreset("custom");setDraft(v=>({...v,from:e.target.value}))}}/></label>
    <label><span>{t("To","শেষ")}</span><input type="date" required value={draft.to} onChange={e=>{setPreset("custom");setDraft(v=>({...v,to:e.target.value}))}}/></label>
    <label className="er-account-filter"><span>{t("Account","অ্যাকাউন্ট")}</span><select value={draft.account} disabled={accountError} onChange={e=>setDraft(v=>({...v,account:e.target.value}))}>
      <option value="">{t("All accounts","সব অ্যাকাউন্ট")}</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.method} · ••••{a.display_suffix}</option>)}
     </select></label>
    <button type="submit" className="er-apply" disabled={loading}>{t("Apply","প্রয়োগ করুন")}</button>
   </form>
   {accountError&&<p className="er-inline-notice" role="status">{t("Account filter unavailable. All-account reporting still works.","অ্যাকাউন্ট ফিল্টার পাওয়া যাচ্ছে না; সব অ্যাকাউন্টের রিপোর্ট দেখা যাবে।")}</p>}
   {!applies&&!loading&&<p className="er-inline-notice" role="status">{t("Filters changed — apply to update the report.","ফিল্টার বদলেছে—রিপোর্ট আপডেট করতে প্রয়োগ করুন।")}</p>}
  </section>
  {loading&&<div className="er-status" role="status">{t("Updating report…","রিপোর্ট আপডেট হচ্ছে…")}</div>}
  {error&&<div className="er-error" role="alert"><span>{error}</span><button type="button" onClick={()=>setRefresh(n=>n+1)}>{t("Retry","আবার চেষ্টা")}</button></div>}
  {stale&&displayed&&<p className="er-inline-notice er-stale">{t("Displaying the previous successful report until new data loads.","নতুন তথ্য আসা পর্যন্ত আগের সফল রিপোর্ট দেখানো হচ্ছে।")}</p>}
  {!displayed&&!loading&&!error&&<section className="er-empty">{t("No report available yet.","এখনো রিপোর্ট পাওয়া যায়নি।")}</section>}
  {displayed&&<div className="er-results" aria-busy={loading}>
   <div className="er-result-period"><span>{active.from} — {active.to}{active.account?" · "+t("Selected account","নির্বাচিত অ্যাকাউন্ট"):""}</span>{generated&&<span>{t("Updated","আপডেট")}: {generated}</span>}</div>
   <section className="er-period-analysis" aria-label={t("Period analysis","সময়সীমার বিশ্লেষণ")}>
    <div className="er-analysis-total">
     <span className="er-eyebrow">{t("VERIFIED COLLECTION · SELECTED PERIOD","যাচাইকৃত টাকা · নির্বাচিত সময়")}</span>
     <strong>{cash(displayed.verified_gross_minor,locale)}</strong>
     <span className="er-analysis-context">{numeric(displayed.payment_count,locale)} {t("verified transactions","টি যাচাইকৃত লেনদেন")}</span>
    </div>
    <div className="er-analysis-metrics">
     <div><span>{t("Average transaction","প্রতি লেনদেনে গড়")}</span><strong>{avg===null?"—":cash(avg,locale)}</strong></div>
     <div><span>{t("Compared with previous period","আগের সময়ের তুলনায়")}</span><strong>{matchedCompare?(delta??t("No previous baseline","আগে লেনদেন নেই")):compareLoading?t("Loading…","লোড হচ্ছে…"):compareError?"—":t("Not compared","তুলনা বন্ধ")}</strong></div>
     <label className="er-comparison-toggle"><input type="checkbox" checked={compare} onChange={e=>{setCompare(e.target.checked);setCompareError("")}}/>{t("Compare previous period","আগের সময়ের সঙ্গে তুলনা")}</label>
    </div>
    {compare&&<div className="er-comparison-detail" role="status">
     {compareLoading?t("Loading previous period…","আগের সময়ের হিসাব আনা হচ্ছে…"):compareError||matchedCompare?<>
      {compareError||<><span>{matchedCompare?.from} — {matchedCompare?.to}</span><span>{t("Previous volume","আগের মোট")}: <strong>{cash(matchedCompare?.report.verified_gross_minor??0,locale)}</strong></span><span>{t("Transaction change","লেনদেনের পরিবর্তন")}: <strong>{countDelta??t("No previous baseline","আগে লেনদেন নেই")}</strong></span></>}
     </>:t("Previous period will appear here.","আগের সময়ের হিসাব এখানে আসবে।")}
    </div>}
   </section>
   <div className="er-analysis-grid">
    <section className="er-card er-trend">
     <div className="er-card-heading">
      <div><h2>{t("Collection over time","সময়ের সঙ্গে সংগ্রহ")}</h2><span>{t("Verified payments · UTC dates","যাচাইকৃত পেমেন্ট · UTC দিন")}</span></div>
      <div className="er-grain-toggle" role="group" aria-label={t("Chart grouping","গ্রাফের সময়ের ভাগ")}>
       <button type="button" aria-pressed={grain==="day"} onClick={()=>setGrain("day")}>{t("Day","দিন")}</button>
       <button type="button" aria-pressed={grain==="week"} onClick={()=>setGrain("week")}>{t("7-day","৭ দিন")}</button>
      </div>
     </div>
     {chartRows.length===0?<div className="er-chart-empty">{t("No verified payments in this period.","এই সময়ে যাচাইকৃত পেমেন্ট নেই।")}</div>:
      <div className="er-chart-scroll"><div className="er-trend-bars" role="img" aria-label={chartRows.map(row=>row.label+": "+cash(row.amount_minor,locale)).join("; ")}>
       {chartRows.map(row=><div className="er-trend-day" key={row.key} title={row.label+" · "+cash(row.amount_minor,locale)}>
        <div className="er-trend-track"><i style={{height:Math.max(2,row.amount_minor/max*100)+"%"}}/></div>
        <span>{row.label}</span>
       </div>)}
      </div></div>}
     <div className="er-trend-footer"><span>{grain==="week"?t("Grouped into 7-day intervals","৭ দিনের ব্যবধানে হিসাব"):t("Daily totals","প্রতিদিনের হিসাব")}</span><button type="button" onClick={()=>setSection("daily")}>{t("View daily table","দৈনিক টেবিল দেখুন")} ↗</button></div>
    </section>
    <section className="er-card er-methods">
     <div className="er-card-heading"><div><h2>{t("Method contribution","মাধ্যম অনুযায়ী অংশ")}</h2><span>{t("Share of verified volume","যাচাইকৃত টাকার অনুপাত")}</span></div></div>
     {methods.length===0?<p className="er-card-empty">{t("No method data for this period.","এই সময়ে মাধ্যমের তথ্য নেই।")}</p>:<div className="er-method-bars">
      {[...methods].sort((a,b)=>b.amount_minor-a.amount_minor).slice(0,6).map(row=><div key={row.method} className="er-method-line">
       <div><span>{row.method}</span><strong>{total>0?(row.amount_minor/total*100).toFixed(1)+"%":"0%"}</strong></div>
       <div className="er-meter"><i style={{width:(total>0?Math.max(0,Math.min(100,row.amount_minor/total*100)):0)+"%"}}/></div>
       <small>{cash(row.amount_minor,locale)} · {numeric(row.payment_count,locale)} {t("payments","পেমেন্ট")}</small>
      </div>)}
     </div>}
    </section>
   </div>
   <section className="er-allocation-analysis">
    <div className="er-allocation-head"><div><h2>{t("Allocation & reconciliation","বরাদ্দ ও হিসাব মিল")}</h2><span>{t("Verified payment allocation, not bank settlement","যাচাইকৃত পেমেন্টের বরাদ্দ, ব্যাংক settlement নয়")}</span></div><Link href={root+"reconciliation"}>{t("Reconciliation","হিসাব মিল")} ↗</Link></div>
    <div className="er-allocation-bar" role="img" aria-label={t("Allocated share","বরাদ্দের অংশ")+": "+allocatedPercent.toFixed(1)+"%"}><i style={{width:allocatedPercent+"%"}}/></div>
    <div className="er-allocation-values">
     <div><span>{t("Allocated","বরাদ্দ")}</span><strong>{cash(displayed.allocated_minor,locale)}</strong></div>
     <div><span>{t("Unallocated","অবরাদ্দ")}</span><strong>{cash(displayed.unallocated_minor,locale)}</strong></div>
     <div><span>{t("Statement linked","স্টেটমেন্টে সংযুক্ত")}</span><strong>{cash(displayed.statement_links.amount_minor,locale)}</strong></div>
    </div>
   </section>
   <section className="er-card er-details">
    <div className="er-details-heading"><h2>{t("Detailed breakdown","বিস্তারিত হিসাব")}</h2><span>{t("BDT · verified amounts","BDT · যাচাইকৃত পরিমাণ")}</span></div>
    <div className="er-tabs" role="group" aria-label={t("Report breakdown","রিপোর্টের বিভাগ")}>
     {sections.map(id=><button type="button" key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{labels[id]}</button>)}
    </div>
    {section==="methods"&&<BreakdownTable locale={locale} headings={[t("Method","মাধ্যম"),t("Transactions","লেনদেন"),t("Verified amount","যাচাইকৃত টাকা")]} rows={displayed.methods.map(r=>[r.method,numeric(r.payment_count,locale),cash(r.amount_minor,locale)])} empty={t("No verified method transactions.","এই সময়ে মাধ্যমভিত্তিক লেনদেন নেই।")}/>}
    {section==="accounts"&&<BreakdownTable locale={locale} headings={[t("Receiving account","গ্রহণকারী অ্যাকাউন্ট"),t("Transactions","লেনদেন"),t("Verified amount","যাচাইকৃত টাকা")]} rows={displayed.accounts.map(r=>[r.method+" ••••"+r.display_suffix,numeric(r.payment_count,locale),cash(r.amount_minor,locale)])} empty={t("No receiving-account payments.","গ্রহণকারী অ্যাকাউন্টে পেমেন্ট নেই।")}/>}
    {section==="customers"&&<><BreakdownTable locale={locale} headings={[t("Invoice-linked customer","ইনভয়েস-সংযুক্ত গ্রাহক"),t("Payments","পেমেন্ট"),t("Allocated","বরাদ্দ")]} rows={displayed.customers.map(r=>[r.name||r.reference,numeric(r.payment_count,locale),cash(r.amount_minor,locale)])} empty={t("No invoice-linked customer payments.","ইনভয়েস-সংযুক্ত গ্রাহকের পেমেন্ট নেই।")}/><p className="er-fineprint">{t("Top 100 invoice-linked contacts; not necessarily the actual payer.","ইনভয়েস-সংযুক্ত সর্বোচ্চ ১০০ জন; তাঁরা প্রকৃত প্রেরক নাও হতে পারেন।")}</p></>}
    {section==="refunds"&&<><BreakdownTable locale={locale} headings={[t("Status","অবস্থা"),t("Requests","অনুরোধ"),t("Amount","পরিমাণ")]} rows={displayed.refunds.map(r=>[refundLabels[r.status]||r.status,numeric(r.request_count,locale),cash(r.amount_minor,locale)])} empty={t("No refund requests in this period.","এই সময়ে রিফান্ড অনুরোধ নেই।")}/><p className="er-fineprint">{t("Refunds are managed by the seller. Reported returns are not provider-confirmed.","রিফান্ড বিক্রেতা পরিচালনা করেন। ফেরতের রিপোর্ট provider-যাচাইকৃত নয়।")}</p><Link className="er-detail-link" href={root+"refunds"}>{t("Manage refunds","রিফান্ড পরিচালনা করুন")} ↗</Link></>}
    {section==="statements"&&<div className="er-statement-box"><span>{t("Merchant-imported statement links","বিক্রেতার স্টেটমেন্ট সংযোগ")}</span><strong>{cash(displayed.statement_links.amount_minor,locale)}</strong><small>{numeric(displayed.statement_links.count,locale)} {t("linked records","সংযুক্ত রেকর্ড")}</small><p>{t("Statement matches do not confirm provider settlement.","স্টেটমেন্টে মিল পাওয়া মানেই provider settlement নিশ্চিত নয়।")}</p><Link href={root+"reconciliation"}>{t("Open reconciliation","Reconciliation খুলুন")} ↗</Link></div>}
    {section==="daily"&&<BreakdownTable locale={locale} headings={[t("Day (UTC)","দিন (UTC)"),t("Verified amount","যাচাইকৃত টাকা")]} rows={displayed.daily.map(r=>[r.day,cash(r.amount_minor,locale)])} empty={t("No verified payments during this period.","এই সময়ে যাচাইকৃত পেমেন্ট নেই।")}/>}
   </section>
  </div>}
 </div>;
}
function BreakdownTable({headings,rows,empty,locale}:{locale:Locale;headings:string[];rows:string[][];empty:string}){
 if(rows.length===0)return <p className="er-card-empty">{empty}</p>;
 return <div className="er-table-scroll" role="region" tabIndex={0} aria-label={locale==="bn"?"রিপোর্টের টেবিল":"Report breakdown table"}>
  <table><thead><tr>{headings.map((x,i)=><th key={i} scope="col" className={i>0?"er-numeric":undefined}>{x}</th>)}</tr></thead>
   <tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,i)=><td key={i} className={i>0?"er-numeric":undefined}>{cell||"—"}</td>)}</tr>)}</tbody></table>
 </div>;
}
