"use client";
import {useEffect,useState} from "react";
type Detail={merchant_reference:string;amount_minor:number;currency:string;state:string;source_reference?:string;
 items?:{title:string;quantity:number;unit_amount_minor:number}[];
 attempt:null|{payer_suffix:string;method:string;window_start:string;window_end:string};
 events:{event_type:string;reason:string;occurred_at:string}[]};
export function PaymentRequestDetail({id,workspaceId,environment,locale}:{
 id:string;workspaceId:string;environment:string;locale:"bn"|"en";onClose:()=>void;
}){
 const bn=locale==="bn";
 const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[copied,setCopied]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/api/go/workspaces/${workspaceId}/payment-intents/${id}?environment=${environment}`,{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error("unavailable");return response.json()})
   .then(body=>{if(!controller.signal.aborted)setDetail(body.data as Detail)})
   .catch(()=>{if(!controller.signal.aborted)setError(true)});
  return ()=>controller.abort();
 },[id,workspaceId,environment,retry]);
 const time=(value:string)=>new Date(value).toLocaleString(bn?"bn-BD":"en-BD",{timeZone:"Asia/Dhaka",timeZoneName:"short"});
 const money=(value:number)=>new Intl.NumberFormat(bn?"bn-BD":"en-BD",{style:"currency",currency:"BDT"}).format(value/100);
 const events:Record<string,string>={created:bn?"রিকোয়েস্ট ইস্যু":"Request issued",payer_locked:bn?"প্রেরক ও মাধ্যম লক":"Payer and method locked",cancelled:bn?"ব্যবসা বাতিল করেছে":"Cancelled by merchant"};
 return <section className="ref-request-details" aria-label={bn?"রিকোয়েস্টের ইতিহাস":"Request history"}>
  {detail&&<div className="drawer-group"><div className="kv"><span>{bn?"পূর্ণ রেফারেন্স":"Full reference"}</span><span className="mono" title={detail.merchant_reference}>{detail.merchant_reference}</span></div><button type="button" className="ib" onClick={()=>void navigator.clipboard.writeText(detail.merchant_reference).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?(bn?"কপি হয়েছে":"Copied"):(bn?"রেফারেন্স কপি":"Copy reference")}</button></div>}
  {error?<p role="alert">{bn?"তথ্য পাওয়া যায়নি বা দেখার অনুমতি নেই।":"Details unavailable or access denied."} <button onClick={()=>{setError(false);setRetry(x=>x+1)}}>{bn?"আবার চেষ্টা":"Retry"}</button></p>:
   !detail?<p role="status">{bn?"তথ্য আনা হচ্ছে…":"Loading details…"}</p>:<>
    <p>{money(detail.amount_minor)} · {detail.source_reference||(bn?"স্বতন্ত্র রিকোয়েস্ট":"Standalone request")}</p>
    <p role="status">{bn?"বর্তমান অবস্থা: ":"Current status: "}<strong>{detail.state==="completed"?(bn?"যাচাইকৃত":"Verified"):detail.state==="awaiting_payment"?(bn?"যাচাইয়ের অপেক্ষা":"Awaiting verification"):detail.state==="cancelled"?(bn?"বাতিল":"Cancelled"):detail.state==="expired"?(bn?"মেয়াদোত্তীর্ণ":"Expired"):(bn?"প্রেরকের অপেক্ষা":"Awaiting payer")}</strong></p>
    {detail.items&&<ul>{detail.items.map((line,i)=><li key={i}>{line.title} — {line.quantity} × {money(line.unit_amount_minor)}</li>)}</ul>}
    {detail.attempt?<dl className="pg05-summary"><div><dt>{bn?"প্রেরক / মাধ্যম":"Payer / method"}</dt><dd>••••{detail.attempt.payer_suffix} · {detail.attempt.method}</dd></div><div><dt>{bn?"মূল সময়সীমা":"Original payment window"}</dt><dd>{time(detail.attempt.window_start)} — {time(detail.attempt.window_end)}</dd></div></dl>:<p>{bn?"প্রেরক এখনও নিশ্চিত করা হয়নি।":"Payer has not been confirmed."}</p>}
    <ol>{detail.events.map((event,i)=><li key={i}>{events[event.event_type]||event.event_type} · <time dateTime={event.occurred_at}>{time(event.occurred_at)}</time></li>)}</ol>
    <p className="pg05-muted">{detail.state==="completed"?(bn?"এই request-এর status সার্ভারের যাচাইকৃত payment allocation থেকে এসেছে; ম্যানুয়ালি paid করা হয়নি।":"Completed status is derived from backend verified payment allocations, not manual mark-paid."):(bn?"এই timeline একা টাকা পাওয়ার প্রমাণ নয়। শুধু সম্পূর্ণ five-field evidence ম্যাচ করলে সার্ভারে স্বয়ংক্রিয় যাচাই হবে।":"This timeline alone is not proof of money received. Only a complete unique five-field evidence match can auto-verify the payment.")}</p>
   </>}
 </section>;
}
