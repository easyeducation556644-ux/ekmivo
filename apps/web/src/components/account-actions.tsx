"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveDisplayName,revokeOtherSessions,type ProfileActionState } from "../actions/profile";
const profileInitial:ProfileActionState={status:"idle",message:""};

type Locale="bn"|"en";
function Submit({label}:{label:string}){
 const {pending}=useFormStatus();
 return <button className="ek-action" type="submit" disabled={pending} aria-busy={pending}>{pending?"…":label}</button>;
}
export function AccountActions({locale,name}:{locale:Locale;name:string}){
 const [profile,save]=useActionState(saveDisplayName.bind(null,locale),profileInitial);
 const [sessions,revoke]=useActionState(revokeOtherSessions.bind(null,locale),profileInitial);
 const bn=locale==="bn";
 return <>
  <section className="ek-account-panel">
   <h2>{bn?"প্রোফাইল আপডেট":"Edit profile"}</h2>
   <form action={save} className="ek-account-form">
    <label>{bn?"আপনার নাম":"Display name"}
     <input name="name" defaultValue={name} type="text" minLength={2} maxLength={100} required autoComplete="name" /></label>
    <Submit label={bn?"নাম সংরক্ষণ":"Save name"}/>
    {profile.status!=="idle"&&<p className={profile.status==="error"?"ek-form-error":"ek-account-success"} role="status">{profile.message}</p>}
   </form>
  </section>
  <section className="ek-account-panel">
   <h2>{bn?"সেশন নিরাপত্তা":"Session security"}</h2>
   <p>{bn?"এখনকার সেশন রেখে অন্য সব সক্রিয় লগইন বন্ধ করা হবে।":"Revoke all other active logins while keeping this session."}</p>
   <form action={revoke} className="ek-account-form">
    <Submit label={bn?"অন্য সেশনগুলো বন্ধ করুন":"Revoke other sessions"}/>
    {sessions.status!=="idle"&&<p className={sessions.status==="error"?"ek-form-error":"ek-account-success"} role="status">{sessions.message}</p>}
   </form>
  </section>
 </>;
}
