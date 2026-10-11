"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createWorkspaceAction } from "../actions/account";
import { emptyState, type FormErrorState } from "../lib/server/validation";
import type { Locale } from "../lib/site-copy";

const modes=[
 {value:"ai",title:{en:"AI Communication",bn:"AI যোগাযোগ"},description:{en:"Inbox, AI, knowledge, CRM and follow-ups.",bn:"ইনবক্স, AI, নলেজ, CRM ও ফলো-আপ।"},icon:"✳"},
 {value:"commerce",title:{en:"Commerce & Payments",bn:"কমার্স ও পেমেন্ট"},description:{en:"Orders, payment verification, devices and courier operations.",bn:"অর্ডার, পেমেন্ট যাচাই, ডিভাইস ও কুরিয়ার পরিচালনা।"},icon:"▦"},
 {value:"both",title:{en:"Both services",bn:"দুটি সেবাই"},description:{en:"Keep both independent services in a connected workspace.",bn:"দুটি স্বাধীন সেবা একটি ওয়ার্কস্পেসে সংযুক্ত করুন।"},icon:"↔"}
] as const;
function Submit({locale}:{locale:Locale}){
 const {pending}=useFormStatus();
 return <button className="ek-action" disabled={pending} type="submit">{pending?(locale==="bn"?"তৈরি হচ্ছে…":"Creating…"):(locale==="bn"?"ওয়ার্কস্পেস তৈরি করুন":"Create workspace")} <span>↗</span></button>;
}
export function WorkspaceOnboarding({locale}:{locale:Locale}){
 const [mode,setMode]=useState<"ai"|"commerce"|"both">("both");
 const [state,action]=useActionState<FormErrorState,FormData>(createWorkspaceAction.bind(null,locale),emptyState);
 return <section className="ek-onboard" aria-labelledby="setup-title">
  <div className="ek-page-kicker">01 / WORKSPACE SETUP</div>
  <h1 id="setup-title">{locale==="bn"?"ব্যবসার ওয়ার্কস্পেস তৈরি করুন।":"Create your workspace."}</h1>
  <p className="ek-lead">{locale==="bn"?"আপনার কাজের ধরন বেছে নিন। পরেও সুবিধাগুলো স্বাধীনভাবে চালু বা বন্ধ করার ব্যবস্থা থাকবে।":"Choose a starting configuration. Service entitlements remain independent of this preference."}</p>
  <form action={action} className="ek-onboard-form">
   <label className="ek-input-label">{locale==="bn"?"ওয়ার্কস্পেসের নাম":"Business or workspace name"}
    <input name="name" type="text" minLength={2} maxLength={100} required placeholder={locale==="bn"?"যেমন: আমার ব্যবসা":"e.g. North Studio"} aria-invalid={!!state.fields?.name}/>
    {state.fields?.name&&<small className="ek-field-error">{state.fields.name}</small>}
   </label>
   <p className="ek-input-label">{locale==="bn"?"প্রয়োজনীয় সেবা নির্বাচন করুন":"Choose your starting services"}</p>
   <div className="ek-mode-grid" role="radiogroup" aria-label={locale==="bn"?"সেবার ধরন":"Service mode"}>
    {modes.map(item=><label className={`ek-mode-card ${mode===item.value?"is-selected":""}`} key={item.value}>
     <input type="radio" name="mode" value={item.value} checked={mode===item.value} onChange={()=>setMode(item.value)}/>
     <span className="ek-mode-icon" aria-hidden="true">{item.icon}</span>
     <strong>{item.title[locale]}</strong>
     <small>{item.description[locale]}</small>
    </label>)}
   </div>
   {state.fields?.mode&&<small className="ek-field-error">{state.fields.mode}</small>}
   {state.status==="error"&&<p className="ek-form-error" role="alert">{state.message}</p>}
   <Submit locale={locale}/>
  </form>
  <p className="ek-onboard-note">{locale==="bn"?"সেবা বেছে নেওয়া মানে কোনো পেইড সাবস্ক্রিপশন সক্রিয় করা নয়।":"Choosing a service does not activate a paid subscription or live provider integration."}</p>
 </section>;
}
