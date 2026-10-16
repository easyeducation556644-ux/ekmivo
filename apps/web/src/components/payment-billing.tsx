"use client";
import {useDashboardInitialData} from "./dashboard-initial-data";
import {useCallback,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import type {PlanTerms} from "../lib/payment-plans";
type Plan={id:string;name:string;amount_minor:number;period_days:number;grace_days?:number;terms?:PlanTerms;version_id?:string};
function normalizePlans(plans:Plan[]){return plans.map(p=>p.terms?{...p,name:p.terms.name,amount_minor:p.terms.amount_minor,period_days:p.terms.period_days}:p)}
type Invoice={id:string;plan_id:string;amount_minor:number;status:string;created_at:string;paid_at?:string;period_days?:number};
type Subscription={state:string;plan_id?:string;paid_until?:string;grace_until?:string};
type BillingData={plans?:Plan[];invoices?:Invoice[];subscription?:Subscription|null;effective?:{active:boolean;access_until?:string;terms?:PlanTerms;extra_payments?:number;period_end?:string};usage?:{used:number;reserved:number};usage_error?:boolean};
function formatDate(value:string|undefined,locale:"bn"|"en"){
 if(value==="infinity")return locale==="bn"?"সবসময় ফ্রি":"Always free"; if(!value||!Number.isFinite(Date.parse(value)))return "—";
 return new Intl.DateTimeFormat(locale==="bn"?"bn-BD":"en-BD",{dateStyle:"medium",timeZone:"Asia/Dhaka"}).format(new Date(value));
}
export function PaymentBilling({locale,workspaceId,canManage}:{locale:"en"|"bn";workspaceId:string;canManage:boolean}){
 const router=useRouter(),bn=locale==="bn",t=useCallback((en:string,bengali:string)=>bn?bengali:en,[bn]),base="/api/go/workspaces/"+workspaceId+"/billing";
 const seed=useDashboardInitialData<BillingData>("billing");
 const [plans,setPlans]=useState<Plan[]>(normalizePlans(seed?.data?.plans??[])),[invoices,setInvoices]=useState<Invoice[]>(seed?.data?.invoices??[]),[subscription,setSubscription]=useState<Subscription|null>(seed?.data?.subscription??null);
 const [details,setDetails]=useState<BillingData|null>(seed?.data??null);
 const [loaded,setLoaded]=useState(Boolean(seed?.data)),[loading,setLoading]=useState(!seed),[busy,setBusy]=useState(false),[error,setError]=useState(seed?.error??""),[notice,setNotice]=useState(""),[operation,setOperation]=useState("");
 const [clock,setClock]=useState(seed?.at??0);
 const idempotency=useRef<{plan:string;key:string}|null>(null);
 const money=(minor:number)=>new Intl.NumberFormat(bn?"bn-BD":"en-BD",{style:"currency",currency:"BDT",maximumFractionDigits:2}).format(minor/100);
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError("");
  try{
   const r=await fetch(base,{cache:"no-store",credentials:"same-origin",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
   if(!r.ok)throw Error(String(r.status));
   const data=await r.json() as BillingData;
   if(!Array.isArray(data.plans)||!Array.isArray(data.invoices))throw Error("INVALID_BILLING_RESPONSE");
   if(signal?.aborted)return;
   setClock(Date.now());setPlans(normalizePlans(data.plans));setInvoices(data.invoices);setSubscription(data.subscription??null);setDetails(data);setLoaded(true);
  }catch(e){if(!signal?.aborted)setError(t("Unable to load billing. No payment was changed.","বিলিং পাওয়া যাচ্ছে না। কোনো পেমেন্ট পরিবর্তন হয়নি।")+" ("+(e instanceof Error?e.message:"UNKNOWN")+")")}
  finally{if(!signal?.aborted)setLoading(false)}
 },[base,t]);
 useEffect(()=>{const c=new AbortController();const start=seed?undefined:setTimeout(()=>void load(c.signal),0);const tick=setInterval(()=>setClock(Date.now()),60000);return()=>{clearTimeout(start);clearInterval(tick);c.abort()}},[load,seed]);
 async function issue(plan:string){
  if(!canManage||busy)return;
  setBusy(true);setOperation(plan);setError("");setNotice("");
  if(!idempotency.current||idempotency.current.plan!==plan)idempotency.current={plan,key:crypto.randomUUID()};
  try{
   const requestKey=idempotency.current!.key;
   const free=plans.find(p=>p.id===plan)?.terms?.kind==="free";
   const r=await fetch(base+(free?"/free":""),{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","Idempotency-Key":requestKey},body:JSON.stringify({plan_id:plan}),signal:AbortSignal.timeout(15000)});
   const data=await r.json() as {checkout_token?:string;error?:{code?:string};code?:string};
   if(!r.ok)throw Error(data.error?.code||data.code||String(r.status));
   if(free){idempotency.current=null;setNotice(t("Free plan activated.","ফ্রি প্ল্যান চালু হয়েছে।"));await load();return}
   if(!data.checkout_token||!/^[A-Za-z0-9_-]{43}$/.test(data.checkout_token))throw Error("PAYMENT_CHECKOUT_NOT_CONFIRMED");
   idempotency.current=null;
   router.push("/"+locale+"/checkout/"+data.checkout_token);
  }catch(e){setError(t("Could not open a verified billing checkout. No renewal was confirmed.","বিলিং চেকআউট খোলা যায়নি। কোনো নবায়ন নিশ্চিত হয়নি।")+" "+(e instanceof Error?e.message:""))}
  finally{setBusy(false);setOperation("")}
 }
 async function reconcile(id:string){
  if(!canManage||busy)return;
  setBusy(true);setOperation(id);setError("");setNotice("");
  try{
   const r=await fetch(base+"/"+id+"/reconcile",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}",signal:AbortSignal.timeout(15000)});
   const data=await r.json() as {renewed?:boolean;error?:{code?:string};code?:string};
   if(!r.ok)throw Error(data.error?.code||data.code||String(r.status));
   setNotice(data.renewed?t("Verified platform payment reconciled.","যাচাইকৃত প্ল্যাটফর্ম পেমেন্ট মিলেছে।"):t("No new subscription renewal was recorded.","নতুন subscription renewal পাওয়া যায়নি।"));
   await load();
  }catch(e){setError(t("Verification could not be confirmed.","পেমেন্ট যাচাই নিশ্চিত হয়নি।")+" "+(e instanceof Error?e.message:""))}
  finally{setBusy(false);setOperation("")}
 }
 const currentPlan=plans.find(x=>x.id===subscription?.plan_id);
 const until=details?.effective?.access_until??subscription?.grace_until??subscription?.paid_until;
 const active=until?until==="infinity"||Date.parse(until)>clock:details?.effective?.active??false;
 return <div className="ws-workbench ws-billing">
  <header className="ws-page-head"><div><h1>{t("Billing & usage","বিলিং ও ব্যবহার")}</h1><p>{t("Service subscription and verified billing payments.","সেবার subscription ও যাচাইকৃত billing payment।")}</p></div><button type="button" className="ws-refresh" disabled={loading||busy} onClick={()=>void load()}>{t("Refresh","রিফ্রেশ")}</button></header>
  {error&&<div className="ws-alert" role="alert"><span>{error}</span><button type="button" disabled={busy} onClick={()=>void load()}>{t("Retry","আবার চেষ্টা")}</button></div>}
  {notice&&<p data-feedback="success" className="ws-note" role="status">{notice}</p>}
  {(error||notice)&&<div className={"mp-toast "+(error?"mp-error":"")} role={error?"alert":"status"}><span>{error||notice}</span><button type="button" aria-label={t("Dismiss","বন্ধ করুন")} onClick={()=>{setError("");setNotice("")}}>×</button></div>}
  {loading?<div className="ws-loading" role="status">{t("Loading subscription…","Subscription লোড হচ্ছে…")}</div>:!loaded?<p className="ws-empty" role="status">{t("Billing records are unavailable. Try Refresh.","বিলিং তথ্য পাওয়া যায়নি। রিফ্রেশ করুন।")}</p>:<>
   <section className="ws-card ws-billing-current"><div className="ws-section-heading"><div><h2>{t("Current subscription","বর্তমান সাবস্ক্রিপশন")}</h2><p>{(locale==="bn"?details?.effective?.terms?.name_bn:details?.effective?.terms?.name)||currentPlan?.name||t("Payment gateway","পেমেন্ট গেটওয়ে")}</p></div><span className="ws-role" data-status={active?"active":"inactive"}>{active?t("Active","সক্রিয়"):subscription?.state||t("Not active","সক্রিয় নয়")}</span></div>
    <div className="ws-billing-stats"><div><span>{t("Paid through","পরিশোধিত মেয়াদ")}</span><strong>{formatDate(subscription?.paid_until,locale)}</strong></div><div><span>{t("Grace through","অতিরিক্ত সময়")}</span><strong>{formatDate(subscription?.grace_until,locale)}</strong></div></div>
    {!subscription&&<p className="ws-muted">{t("No verified subscription renewal is recorded.","যাচাইকৃত subscription renewal নেই।")}</p>}
    <div className="mp-metrics"><div><small>{t("Successful payments","সফল পেমেন্ট")}</small><strong>{details?.usage?.used??"—"}</strong></div><div><small>{t("Reserved by open checkouts","খোলা checkout-এর সংরক্ষিত slot")}</small><strong>{details?.usage?.reserved??"—"}</strong></div><div><small>{t("Available now","এখন অবশিষ্ট")}</small><strong>{details?.effective?.terms?.payment_limit===null?t("Unlimited","আনলিমিটেড"):details?.usage&&details?.effective?.terms?Math.max(0,(details.effective.terms.payment_limit??0)+(details.effective.extra_payments??0)-details.usage.used-details.usage.reserved):"—"}</strong></div></div>
    {details?.usage_error&&<p role="alert">{t("Live usage is temporarily unavailable.","Live ব্যবহারের তথ্য এখন পাওয়া যাচ্ছে না।")}</p>}
    {details?.effective?.terms&&<p>{t("Allowance period ends","Allowance মেয়াদ শেষ")}: {formatDate(details.effective.period_end,locale)}</p>}
    {details?.usage&&details.effective?.terms?.payment_limit!=null&&(details.usage.used+details.usage.reserved)>=details.effective.terms.payment_limit*.8&&<p role="status">{t("At least 80% of your allowance is used or reserved. Upgrade before creating more checkouts.","Allowance-এর অন্তত ৮০% খরচ বা সংরক্ষিত। প্রয়োজন অনুযায়ী upgrade করুন।")}</p>}
   </section>
   <section className="ws-card"><div className="ws-section-heading"><div><h2>{t("Available plans","উপলব্ধ প্ল্যান")}</h2><p>{t("A plan checkout creates an invoice; activation requires verified payment.","প্ল্যান checkout-এ ইনভয়েস তৈরি হয়; যাচাইকৃত পেমেন্টের পর সক্রিয় হয়।")}</p></div></div>
    {!plans.length?<p className="ws-empty">{t("No public plans are published yet.","পাবলিক প্ল্যান এখনো প্রকাশ করা হয়নি।")}</p>:<div className="ws-plan-grid">{plans.map(plan=><article id={`plan-${plan.id}`} key={plan.id} className="ws-plan"><span>{locale==="bn"&&plan.terms?.name_bn?plan.terms.name_bn:plan.name}</span><strong>{plan.terms?.kind==="custom"?t("Contact sales","যোগাযোগ করুন"):money(plan.amount_minor)}</strong><small>{plan.terms?.kind==="free"?(plan.terms.free_days?t(`Free for ${plan.terms.free_days} days`,`${plan.terms.free_days} দিন ফ্রি`):t("Always free","সবসময় ফ্রি")):plan.terms?.kind==="custom"?t("Negotiated terms","আলোচনাসাপেক্ষ শর্ত"):t("per","প্রতি")+" "+plan.period_days+" "+t("days","দিন")}</small>{plan.terms&&<><strong>{plan.terms.payment_limit??t("Unlimited","আনলিমিটেড")} {t("successful payments","সফল পেমেন্ট")}</strong><small>{plan.terms.quota_period=== "calendar"?t("Per calendar month","প্রতি ক্যালেন্ডার মাসে"):plan.terms.quota_period==="term"?t("For subscription term","সাবস্ক্রিপশন মেয়াদে"):t(`Each ${plan.period_days} days`,`প্রতি ${plan.period_days} দিন`)}</small></>}{plan.terms?.kind==="custom"?<a className="ws-primary" href={plan.terms.contact_url}>{t("Contact sales","যোগাযোগ করুন")}</a>:canManage?<button disabled={busy||(plan.terms?.kind==="free"&&!!subscription)} className="ws-primary" type="button" onClick={()=>void issue(plan.id)}>{busy&&operation===plan.id?t("Opening…","খোলা হচ্ছে…"):plan.terms?.kind==="free"?t("Activate free plan","ফ্রি প্ল্যান চালু করুন"):t("Choose & pay","নির্বাচন ও পেমেন্ট")}</button>:<span className="ws-muted">{t("Owner or admin can choose a plan.","মালিক বা অ্যাডমিন প্ল্যান বেছে নিতে পারবেন।")}</span>}</article>)}</div>}
   </section>
   <section className="ws-card"><div className="ws-section-heading"><div><h2>{t("Billing history","বিলিং ইতিহাস")}</h2><p>{t("Platform subscription invoices, separate from your customers' invoices.","শুধু প্ল্যাটফর্ম subscription invoice; গ্রাহকের invoice আলাদা।")}</p></div></div>
    {!invoices.length?<p className="ws-empty">{t("No subscription invoices yet.","এখনো subscription invoice নেই।")}</p>:<div className="ws-table-wrap" tabIndex={0} role="region" aria-label={t("Billing invoices","বিলিং ইনভয়েস")}><table className="ws-table"><thead><tr><th>{t("Plan","প্ল্যান")}</th><th>{t("Amount","পরিমাণ")}</th><th>{t("Created","তৈরির সময়")}</th><th>{t("Status","অবস্থা")}</th><th>{t("Action","কাজ")}</th></tr></thead><tbody>{invoices.map(inv=><tr key={inv.id}><td>{plans.find(p=>p.id===inv.plan_id)?.name||inv.plan_id}</td><td>{money(inv.amount_minor)}</td><td>{formatDate(inv.created_at,locale)}</td><td><span className="ws-role" data-status={inv.status}>{inv.status}</span></td><td>{canManage&&inv.status!=="paid"?<button type="button" disabled={busy} onClick={()=>void reconcile(inv.id)}>{busy&&operation===inv.id?t("Checking…","যাচাই হচ্ছে…"):t("Check payment","পেমেন্ট যাচাই")}</button>:t("—","—")}</td></tr>)}</tbody></table></div>}
   </section>
   <p className="ws-billing-disclaimer">{t("This billing is separate from merchant collections or AI usage. A checkout request does not confirm funds until the server verifies a platform payment. No automatic bank debit.","এটি বিক্রেতার টাকা গ্রহণ বা AI ব্যবহারের বিল নয়। সার্ভারে পেমেন্ট যাচাই না হওয়া পর্যন্ত checkout তৈরি মানেই পরিশোধ নয়। স্বয়ংক্রিয় bank debit হয় না।")}</p>
  </>}
 </div>;
}
