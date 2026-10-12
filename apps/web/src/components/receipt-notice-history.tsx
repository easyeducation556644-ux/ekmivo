"use client";
import {useCallback,useEffect,useState} from "react";

type Notice={id:string;status:string;attempts:number;reason:string;consent_withdrawn:boolean};
export function ReceiptNoticeHistory({workspaceId,environment,paymentId,bn,canManage}:{workspaceId:string;environment:string;paymentId:string;bn:boolean;canManage:boolean}){
 const [items,setItems]=useState<Notice[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reason,setReason]=useState(""),[busy,setBusy]=useState(false);
 const base=`/api/go/workspaces/${workspaceId}/operations/notices/`;
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError("");
  try{
   const response=await fetch(`${base}${paymentId}?environment=${environment}`,{cache:"no-store",signal});
   if(!response.ok)throw new Error("unavailable");
   const body=await response.json();if(!signal?.aborted)setItems(body.items||[]);
  }catch{if(!signal?.aborted)setError(!navigator.onLine?(bn?"সংযোগ নেই। আবার সংযুক্ত হয়ে দেখুন।":"Offline. Reconnect and refresh."):(bn?"রসিদের ইমেইলের তথ্য পাওয়া যাচ্ছে না।":"Receipt email source unavailable."))}
  finally{if(!signal?.aborted)setLoading(false)}
 },[base,paymentId,environment,bn]);
 useEffect(()=>{const abort=new AbortController();void Promise.resolve().then(()=>load(abort.signal));return()=>abort.abort()},[load]);
 async function retry(id:string){
  if(busy||reason.trim().length<10)return;
  if(!window.confirm(bn?"গ্রাহক আগেই ইমেইল পেয়ে থাকতে পারেন। আবার পাঠানোর অনুমতি দিচ্ছেন? পেমেন্ট বদলাবে না।":"The customer may already have this email. Authorize another send? Payment is unchanged."))return;
  setBusy(true);setError("");
  try{
   const response=await fetch(`${base}${id}/retry?environment=${environment}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason})});
   if(!response.ok)throw new Error("failed");setReason("");await load();
  }catch{setError(bn?"আবার পাঠানোর অনুরোধ নিশ্চিত হয়নি।":"Resend request was not confirmed.")}
  finally{setBusy(false)}
 }
 const labels:Record<string,string>={pending:bn?"অপেক্ষমাণ":"Pending",sending:bn?"পাঠানো হচ্ছে":"Sending",accepted:bn?"SMTP গ্রহণ করেছে—ইনবক্সে পৌঁছানো নিশ্চিত নয়":"SMTP accepted— inbox delivery unconfirmed",unknown:bn?"ফল অনিশ্চিত":"Outcome unknown",failed:bn?"ব্যর্থ":"Failed",withdrawn:bn?"সম্মতি প্রত্যাহার":"Consent withdrawn"};
 return <section className="pg09-detail-history" aria-label={bn?"রসিদের ইমেইল হিস্ট্রি":"Receipt email history"}>
  <h2>{bn?"রসিদের ইমেইল হিস্ট্রি":"Receipt email history"}</h2>
  {loading?<p role="status">{bn?"লোড হচ্ছে…":"Loading…"}</p>:error?<p role="alert">{error}</p>:items.length===0?<p>{bn?"এই পেমেন্টের জন্য যাচাইকৃত ইমেইলের notice নেই।":"No verified-contact email notice for this payment."}</p>:<ul>{items.map(n=><li key={n.id}>
   <p>{labels[n.status]||n.status} · {n.attempts} {bn?"চেষ্টা":"attempts"}</p>
   {canManage&&!n.consent_withdrawn&&["failed","unknown"].includes(n.status)&&<button type="button" disabled={busy||reason.trim().length<10} onClick={()=>void retry(n.id)}>{bn?"অনুমোদিত ইমেইল পুনরায় পাঠান":"Authorize email resend"}</button>}
  </li>)}</ul>}
  {canManage&&items.some(n=>!n.consent_withdrawn&&["failed","unknown"].includes(n.status))&&<label>{bn?"পুনরায় পাঠানোর কারণ (কমপক্ষে ১০ অক্ষর)":"Reason for resend (at least 10 characters)"}<textarea minLength={10} maxLength={400} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label>}
  <button type="button" disabled={busy||loading} onClick={()=>void load()}>{bn?"হিস্ট্রি আবার দেখুন":"Refresh history"}</button>
 </section>;
}
