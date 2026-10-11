"use client";
import { useActionState } from "react";
import { beginAdminMfaAction,confirmAdminMfaAction,type MfaActionState } from "../actions/admin-mfa";

const initial:MfaActionState={status:"idle",message:""};
export function AdminMfaForm({locale,ready}:{locale:"bn"|"en";ready:boolean}){
 const [setup,begin,pendingSetup]=useActionState(beginAdminMfaAction.bind(null,locale),initial);
 const [check,confirm,pendingConfirm]=useActionState(confirmAdminMfaAction.bind(null,locale),initial);
 return <div className="ek-verify-card" style={{maxWidth:520,width:"100%"}}>
  <div className="ek-verify-mark">e<span>.</span></div>
  <span className="ek-page-kicker">ACCOUNT SECURITY / MFA</span>
  <h1>{locale==="bn"?"অ্যাডমিন নিরাপত্তা":"Administrator security"}</h1>
  <p>{locale==="bn"?"অ্যাডমিন প্যানেলের জন্য Authenticator verification বাধ্যতামূলক।":"Authenticator verification is required before you can access platform administration."}</p>
  {!ready&&<p className="ek-form-error" role="alert">{locale==="bn"?"MFA encryption key server-এ এখনো কনফিগার হয়নি।":"The server MFA encryption key is not configured."}</p>}
  <form action={begin} className="ek-recovery-form">
   <label>{locale==="bn"?"অ্যাকাউন্ট পাসওয়ার্ড নিশ্চিত করো":"Confirm account password"}
    <input name="password" type="password" autoComplete="current-password" required minLength={1} maxLength={256} disabled={!ready}/></label>
   <button className="ek-action" type="submit" disabled={!ready||pendingSetup}>{pendingSetup?"…":locale==="bn"?"Authenticator সেটআপ":"Set up authenticator"} ↗</button>
   {setup.status!=="idle"&&<p className={setup.status==="error"?"ek-form-error":"ek-verify-help"} role="status">{setup.message}</p>}
  </form>
  {setup.setupKey&&<section style={{marginTop:20}} aria-label="Authenticator setup secret">
   <p>{locale==="bn"?"Authenticator অ্যাপে Ekmivo নামে নতুন account যোগ করো।":"Add a new account named Ekmivo to your authenticator."}</p>
   <div className="ek-verify-help" style={{overflowWrap:"anywhere",fontFamily:"monospace",fontSize:15,letterSpacing:2}}>{setup.setupKey}</div>
   <p style={{fontSize:12}}>{locale==="bn"?"Secret অন্য কাউকে দেবে না।":"Keep this setup secret private."}</p>
  </section>}
  <form action={confirm} className="ek-recovery-form" style={{marginTop:26}}>
   <label>{locale==="bn"?"Authenticator-এর ৬ সংখ্যার কোড":"Six-digit authenticator code"}
    <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" required disabled={!ready}/></label>
   <button className="ek-action" type="submit" disabled={!ready||pendingConfirm}>{pendingConfirm?"…":locale==="bn"?"যাচাই করে অ্যাডমিনে যাও":"Verify and open admin"} ↗</button>
   {check.status!=="idle"&&<p className={check.status==="error"?"ek-form-error":"ek-verify-help"} role="status">{check.message}</p>}
  </form>
 </div>;
}
