"use client";
import Link from "next/link";
import { useActionState,useState } from "react";
import { requestPasswordResetAction,completePasswordResetAction,type RecoveryState } from "../actions/recovery";
import type { Locale } from "../lib/site-copy";
const initial:RecoveryState={status:"idle",message:""};
export function RecoveryForm({locale}:{locale:Locale}){
 const [email,setEmail]=useState("");
 const [requestState,requestAction,requestPending]=useActionState(requestPasswordResetAction.bind(null,locale),initial);
 const [resetState,resetAction,resetPending]=useActionState(completePasswordResetAction.bind(null,locale),initial);
 const isSent=requestState.status==="sent";
 return <main className="ek-verification-screen"><div className="ek-verify-card ek-reset-card">
  <div className="ek-verify-mark">e<span>.</span></div>
  <span className="ek-page-kicker">ACCOUNT SECURITY / 02</span>
  <h1>{locale==="bn"?"পাসওয়ার্ড ফিরে পান":"Recover your account"}</h1>
  <p>{locale==="bn"?"ইমেইলে একটি ছয় সংখ্যার নিরাপত্তা কোড পাঠানো হবে।":"We’ll email a six-digit security code to your registered address."}</p>
  <form action={requestAction} className="ek-recovery-form">
   <label>{locale==="bn"?"ইমেইল":"Email address"}<input type="email" name="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254}/></label>
   <button disabled={requestPending} className="ek-action" type="submit">{requestPending?"…":isSent?(locale==="bn"?"আবার কোড পাঠান":"Request a new code"):(locale==="bn"?"কোড পাঠান":"Send recovery code")} ↗</button>
   {requestState.status!=="idle"&&<p role="status" className={requestState.status==="error"?"ek-form-error":"ek-verify-help"}>{requestState.message}</p>}
  </form>
  {isSent&&resetState.status!=="success"&&<form action={resetAction} className="ek-recovery-form ek-reset-step">
   <input type="hidden" name="email" value={email}/>
   <label>{locale==="bn"?"ছয় সংখ্যার কোড":"Six-digit code"}<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="000000"/></label>
   <label>{locale==="bn"?"নতুন পাসওয়ার্ড":"New password"}<input type="password" name="password" minLength={12} required autoComplete="new-password"/></label>
   <label>{locale==="bn"?"পাসওয়ার্ড নিশ্চিত করুন":"Confirm password"}<input type="password" name="confirm" minLength={12} required autoComplete="new-password"/></label>
   <button disabled={resetPending} type="submit" className="ek-action">{locale==="bn"?"পাসওয়ার্ড পরিবর্তন করুন":"Update password"} ↗</button>
   {resetState.status==="error"&&<p className="ek-form-error" role="alert">{resetState.message}</p>}
  </form>}
  {resetState.status==="success"&&<p className="ek-verify-help" role="status">{resetState.message}</p>}
  <Link className="ek-verify-back" href={`/${locale}/login`}>← {locale==="bn"?"লগইনে ফিরুন":"Back to sign in"}</Link>
 </div></main>;
}
