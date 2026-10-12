"use client";
import {useCallback,useEffect,useRef,useState} from "react";

type Store={store:string;status:string;reason:string|null;retained_until:string|null};
type Request={id:string;kind:string;status:string;created_at:string;stores:Store[]};

export function PaymentPrivacy({locale,workspaceId}:{locale:"en"|"bn";workspaceId:string}){
 const bn=locale==="bn",t=useCallback((en:string,bengali:string)=>bn?bengali:en,[bn]);
 const [requests,setRequests]=useState<Request[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false),[kind,setKind]=useState("export"),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(false),[unconfirmed,setUnconfirmed]=useState(false);
 const key=useRef<string|null>(null),base=`/api/go/workspaces/${workspaceId}/privacy`;
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError("");
  try{const r=await fetch(base,{cache:"no-store",signal});if(!r.ok)throw Error();const d=await r.json();if(!signal?.aborted)setRequests(d.items)}
  catch{if(!signal?.aborted)setError(t("Privacy status unavailable. Retry.","গোপনীয়তার অনুরোধের অবস্থা পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।"))}
  finally{if(!signal?.aborted)setLoading(false)}
 },[base,t]);
 useEffect(()=>{const c=new AbortController();void Promise.resolve().then(()=>{if(!c.signal.aborted)return load(c.signal)});return()=>c.abort()},[load]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;key.current??=crypto.randomUUID();setBusy(true);setUnconfirmed(true);setError("");
  try{const r=await fetch(base,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key.current},body:JSON.stringify({kind,current_password:password,confirm_request:confirm})});if(!r.ok){if([400,401,403,404,422].includes(r.status)){key.current=null;setUnconfirmed(false)}throw Error()}key.current=null;setUnconfirmed(false);setPassword("");setConfirm(false);await load()}
  catch{setError(t("The request is unconfirmed. Retry with the same request type.","অনুরোধ নিশ্চিত হয়নি। একই ধরনের অনুরোধ আবার চেষ্টা করুন।"))}
  finally{setBusy(false)}
 }
 async function cancelRequest(id:string){
  if(busy||!password||!window.confirm(t("Cancel this request before processing? Existing records are kept.","কাজ শুরুর আগে এই অনুরোধ বাতিল করবেন? বর্তমান তথ্য থাকবে।")))return;
  setBusy(true);setError("");
  try{const r=await fetch(`${base}/${id}/cancel`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({current_password:password,confirm_request:true})});if(!r.ok)throw Error();setPassword("");await load()}
  catch{setError(t("Cancellation unconfirmed or processing already started. Refresh status before retrying.","বাতিল নিশ্চিত হয়নি অথবা কাজ শুরু হয়েছে। আবার চেষ্টা করার আগে অবস্থা refresh করুন।"))}
  finally{setBusy(false)}
 }
 const statuses:Record<string,string>={requested:t("Requested","অনুরোধ এসেছে"),processing:t("Processing","কাজ চলছে"),blocked:t("Waiting for a required review","প্রয়োজনীয় যাচাইয়ের অপেক্ষায়"),complete:t("Complete","সম্পন্ন"),complete_with_retention:t("Complete with disclosed retained records","রাখতে হওয়া তথ্যসহ সম্পন্ন"),cancelled:t("Cancelled","বাতিল"),pending:t("Pending","বাকি"),exported:t("Exported","Export হয়েছে"),deleted:t("Deleted","মুছে ফেলা হয়েছে"),retained:t("Retained under reviewed policy","পর্যালোচিত নীতি অনুযায়ী রাখা হয়েছে"),not_applicable:t("Not applicable; evidence recorded","প্রযোজ্য নয়; প্রমাণ নথিভুক্ত")};
 const stores:Record<string,string>={control:t("Business and team","ব্যবসা ও Team"),financial_live:t("Live financial records","আসল পেমেন্টের তথ্য"),financial_sandbox:t("Sandbox records","Sandbox-এর তথ্য"),private_objects:t("Private uploads","ব্যক্তিগত আপলোড"),jobs:t("Queued work and notifications","চলমান কাজ ও নোটিফিকেশন"),android_cache:t("Android device cache","Android ফোনে থাকা তথ্য"),backups:t("Backups","Backup")};
 return <section className="ds-panel pg10-workspace"><h2>{t("Data and privacy","তথ্য ও গোপনীয়তা")}</h2>
 <p>{t("Request a business data export or deletion. Each storage location is tracked separately. Financial records subject to retention and backups cannot be described as erased until the recorded policy and evidence allow it. A request does not immediately close your business or delete data.","ব্যবসার তথ্য export বা মুছে ফেলার অনুরোধ করুন। প্রতিটি সংরক্ষণস্থানের অবস্থা আলাদা দেখা যাবে। নির্ধারিত সময় রাখতে হওয়া আর্থিক তথ্য ও backup নীতি ও প্রমাণ ছাড়া মুছে গেছে বলা হবে না। অনুরোধ দিলেই ব্যবসা বন্ধ বা তথ্য মুছে যায় না।")}</p>
 <form className="pg10-form" onSubmit={submit}><label>{t("Request","অনুরোধ")}<select value={kind} disabled={busy||unconfirmed} onChange={e=>{setKind(e.target.value);key.current=null}}><option value="export">{t("Export business data","ব্যবসার তথ্য export")}</option><option value="delete">{t("Delete business data","ব্যবসার তথ্য মুছুন")}</option></select></label><label>{t("Current password","বর্তমান password")}<input type="password" autoComplete="current-password" required maxLength={1024} disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/></label><label><input type="checkbox" required checked={confirm} disabled={busy} onChange={e=>setConfirm(e.target.checked)}/>{t("I understand this creates a tracked request, subject to retention and evidence review.","বুঝেছি: এটি নীতি ও প্রমাণ যাচাইয়ের অধীন একটি নথিভুক্ত অনুরোধ।")}</label><button disabled={busy}>{t("Submit request","অনুরোধ পাঠান")}</button></form>
 <button disabled={loading||busy} onClick={()=>void load()}>{t("Refresh status","অবস্থা আবার দেখুন")}</button>{loading&&<p role="status">{t("Loading privacy requests…","অনুরোধ লোড হচ্ছে…")}</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&requests.length===0&&<p>{t("No privacy requests yet.","এখনও গোপনীয়তার অনুরোধ নেই।")}</p>}
 {requests.map(r=><article key={r.id}><h3>{r.kind==="export"?t("Data export","তথ্য export"):t("Data deletion","তথ্য মোছা")}</h3>{r.status==="requested"&&<button disabled={busy||unconfirmed||!password} onClick={()=>void cancelRequest(r.id)}>{t("Cancel request (current password required)","অনুরোধ বাতিল (বর্তমান password প্রয়োজন)")}</button>}<p>{statuses[r.status]??r.status} · {new Date(r.created_at).toLocaleString(locale)}</p><dl>{r.stores.map(s=><div key={s.store}><dt>{stores[s.store]??s.store}</dt><dd>{statuses[s.status]??s.status}{s.reason&&<p>{s.reason}</p>}{s.retained_until&&<p>{t("Retained until","রাখার শেষ সময়")}: {new Date(s.retained_until).toLocaleString(locale)}</p>}</dd></div>)}</dl></article>)}
 </section>;
}
