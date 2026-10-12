"use client";
import {useEffect,useState} from "react";
export function PaymentServiceStatus({locale}:{locale:"en"|"bn"}){
 const [status,setStatus]=useState("unknown"),[busy,setBusy]=useState(false),[time,setTime]=useState<string|null>(null);
 async function refresh(signal?:AbortSignal){setBusy(true);try{const r=await fetch("/api/service-status",{signal,cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();if(!signal?.aborted){setStatus(d.payment_service);setTime(d.observed_at)}}catch{if(!signal?.aborted)setStatus("unknown")}finally{if(!signal?.aborted)setBusy(false)}}
 useEffect(()=>{const c=new AbortController();void Promise.resolve().then(()=>{if(!c.signal.aborted)return refresh(c.signal)});return()=>c.abort()},[]);
 const labels:Record<string,[string,string]>={unknown:["Status unavailable","অবস্থা পাওয়া যাচ্ছে না"],operational:["Payment service responding","Payment service সাড়া দিচ্ছে"],unavailable:["Payment service not ready","Payment service প্রস্তুত নয়"]};
 return <section className="ds-panel"><h2>{locale==="bn"?"সেবার অবস্থা":"Service status"}</h2><p role="status">{labels[status]?.[locale==="bn"?1:0]??labels.unknown[0]}</p>{time&&<p>{new Date(time).toLocaleString(locale)}</p>}<p>{locale==="bn"?"এটি service readiness; real transaction ও release verification-এর বিকল্প নয়।":"This is service readiness, not transaction or release verification."}</p><button disabled={busy} onClick={()=>void refresh()}>{locale==="bn"?"আবার দেখুন":"Refresh"}</button></section>;
}
