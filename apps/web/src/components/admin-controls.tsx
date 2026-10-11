"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setEmailVerificationAction,setPlatformRoleAction,type AdminActionState } from "../actions/platform-admin";
type Locale="bn"|"en";
const initial:AdminActionState={status:"idle",message:""};
function SaveButton({locale}:{locale:Locale}){const {pending}=useFormStatus();return <button type="submit" className="ek-action" disabled={pending}>{pending?"…":locale==="bn"?"সংরক্ষণ করুন":"Save changes"} ↗</button>;}
export function VerificationSettings({locale,enabled,providerReady}:{locale:Locale;enabled:boolean;providerReady:boolean}){
 const [state,action]=useActionState(setEmailVerificationAction.bind(null,locale),initial);
 return <section className="ek-panel ek-settings-panel">
  <div className="ek-panel-head"><h2>{locale==="bn"?"ইমেইল যাচাই":"Email verification"}</h2><span>{enabled?"ENABLED":"DISABLED"}</span></div>
  <p>{locale==="bn"?"Register-এর পর ছয় সংখ্যার কোড দিয়ে email verification। ডিফল্ট OFF।":"Require six-digit email verification after registration. Default OFF."}</p>
  <form action={action} className="ek-admin-form">
   <label>{locale==="bn"?"অবস্থা":"Verification requirement"}<select name="enabled" defaultValue={enabled?"on":"off"}><option value="off">OFF — {locale==="bn"?"যাচাই প্রয়োজন নেই":"No verification required"}</option><option value="on">ON — {locale==="bn"?"যাচাই প্রয়োজন":"Verification required"}</option></select></label>
   <SaveButton locale={locale}/>
  </form>
  {state.status!=="idle"&&<p className={state.status==="error"?"ek-form-error":"ek-verify-help"} role="status">{state.message}</p>}
  <div className="ek-provider-status"><div><strong>Resend</strong><span>{providerReady?"CONFIGURED":"NOT CONNECTED"}</span></div><p>{locale==="bn"?"Email provider connection: Resend API key, verified sender domain এবং OTP secret সার্ভারের environment-এ দিতে হবে। Configured না হলে verification ON হবে না।":"Email provider: configure Resend API key, verified sender and OTP secret in secure server environment variables. Verification cannot be enabled without them."}</p></div>
 </section>;
}
export function RoleControls({locale,users}:{locale:Locale;users:Array<{id:string;email:string;name:string;verified:boolean;role:string|null}>}){
 const [state,action]=useActionState(setPlatformRoleAction.bind(null,locale),initial);
 return <section className="ek-panel ek-settings-panel">
  <div className="ek-panel-head"><h2>{locale==="bn"?"প্ল্যাটফর্ম রোল পরিচালনা":"Platform role management"}</h2><span>RBAC</span></div>
  <p>{locale==="bn"?"শুধু যাচাইকৃত user-কে role দেওয়া যাবে। সব পরিবর্তন audit log-এ থাকবে।":"Grant roles only to verified users. Every update creates an audit entry."}</p>
  <div className="ek-admin-role-list">{users.map(u=><div key={u.id} className="ek-admin-role-row"><span className="ek-avatar">{u.name[0]?.toUpperCase()}</span><div><strong>{u.name}</strong><small>{u.email} · {u.verified?"Verified":"Unverified"} · {u.role||"No admin role"}</small></div></div>)}</div>
  <form action={action} className="ek-admin-form">
   <label>{locale==="bn"?"ইউজার":"Select user"}<select name="userId" required defaultValue=""><option value="" disabled>—</option>{users.filter(u=>u.verified).map(u=><option value={u.id} key={u.id}>{u.name} ({u.email})</option>)}</select></label>
   <label>{locale==="bn"?"নতুন role":"Assign role"}<select name="role" defaultValue="analyst"><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="support">Support</option><option value="analyst">Analyst</option><option value="remove">Remove admin access</option></select></label>
   <SaveButton locale={locale}/>
  </form>
  {state.status!=="idle"&&<p className={state.status==="error"?"ek-form-error":"ek-verify-help"} role="status">{state.message}</p>}
 </section>;
}
