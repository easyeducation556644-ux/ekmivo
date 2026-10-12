"use client";
import {useState} from "react";

export function ReceiptNotice({token,bn}:{token:string;bn:boolean}){
 const [email,setEmail]=useState("");const [consent,setConsent]=useState(false);
 const [code,setCode]=useState("");const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");const [sent,setSent]=useState(false);
 async function submit(action:"subscribe"|"verify"|"withdraw"){
  if(busy)return;setBusy(true);setMessage("");
  try{
   const response=await fetch(`/api/checkout/${token}/notices/${action}`,{
    method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:JSON.stringify(action==="subscribe"?{email,consent,locale:bn?"bn":"en"}:{code}),
   });
   if(!response.ok){setMessage(bn?"কাজটি নিশ্চিত হয়নি। সংযোগ ও কোড দেখে আবার চেষ্টা করুন। পেমেন্টের অবস্থা বদলায়নি।":"The action was not confirmed. Check the connection and code. Payment status is unchanged.");return}
   if(action==="subscribe"){setSent(true);setEmail("");setMessage(bn?"ইমেইলের verification code এখানে দিন।":"Enter the verification code sent to your email.")}
   else {setCode("");setMessage(action==="verify"?(bn?"রসিদের ইমেইল চালু হয়েছে।":"Receipt emails enabled."):(bn?"রসিদের ইমেইল বন্ধ হয়েছে।":"Receipt emails withdrawn."))}
  }catch{setMessage(bn?"সংযোগ নেই। কোনো সফল ফল নিশ্চিত হয়নি।":"Connection unavailable. No success was confirmed.")}
  finally{setBusy(false)}
 }
 return <section aria-label={bn?"রসিদের ইমেইল":"Receipt email"}>
  <h2>{bn?"ইমেইলে রসিদ (ঐচ্ছিক)":"Receipt by email (optional)"}</h2>
  <p>{bn?"ইমেইল পেমেন্টের প্রমাণ নয়। প্রেরক নম্বর আলাদাভাবে যাচাই হবে।":"Email is not payment proof. Your actual payer number is verified separately."}</p>
  <form onSubmit={e=>{e.preventDefault();void submit("subscribe")}}>
   <label>{bn?"ইমেইল":"Email"}<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
   <label><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/>{bn?"শুধু এই পেমেন্টের রসিদের জন্য ইমেইল ব্যবহারে সম্মতি দিচ্ছি।":"I consent to using this email for this payment's receipt only."}</label>
   <button disabled={busy||!consent}>{bn?"ইমেইল যাচাই করুন":"Verify email"}</button>
  </form>
  {!sent&&<button type="button" onClick={()=>setSent(true)}>{bn?"আগেই verification/withdrawal code আছে?":"Already have a verification or withdrawal code?"}</button>}
  {sent&&<form onSubmit={e=>{e.preventDefault();void submit("verify")}}>
   <label>{bn?"ইমেইলে পাওয়া কোড":"Code from your email"}<input autoComplete="off" required minLength={43} maxLength={43} value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>
   <button disabled={busy}>{bn?"সম্মতি নিশ্চিত করুন":"Confirm subscription"}</button>
   <button type="button" disabled={busy||code.length!==43} onClick={()=>void submit("withdraw")}>{bn?"Withdrawal code দিয়ে বন্ধ করুন":"Withdraw with withdrawal code"}</button>
  </form>}
  <p role="status" aria-live="polite">{busy?(bn?"অপেক্ষা করুন…":"Please wait…"):message}</p>
 </section>;
}
