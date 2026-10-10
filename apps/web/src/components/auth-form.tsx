"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, registerAction } from "../actions/account";
import { emptyState, type FormErrorState } from "../lib/server/validation";
import type { Locale } from "../lib/site-copy";

const copy={
 en:{login:{title:"Welcome back.",subtitle:"Sign in to your Ekmivo workspace.",submit:"Sign in",bottom:"New to Ekmivo?",swap:"Create an account"},register:{title:"Make room for better work.",subtitle:"Your first workspace is one step away.",submit:"Create account",bottom:"Already registered?",swap:"Sign in"},name:"Full name",email:"Email address",password:"Password",confirm:"Confirm password",show:"Show",hide:"Hide",strength:"At least 12 characters.",error:"Unable to continue",back:"Back to home",privacy:"Your credentials are processed on the server. Never share passwords.",pending:"Please wait…"},
 bn:{login:{title:"আবার স্বাগতম।",subtitle:"Ekmivo ওয়ার্কস্পেসে প্রবেশ করুন।",submit:"লগ ইন করুন",bottom:"Ekmivo-তে নতুন?",swap:"অ্যাকাউন্ট তৈরি করুন"},register:{title:"নতুনভাবে কাজ শুরু করুন।",subtitle:"অ্যাকাউন্ট তৈরি করে প্রথম ওয়ার্কস্পেস সেটআপ করুন।",submit:"অ্যাকাউন্ট তৈরি করুন",bottom:"আগেই অ্যাকাউন্ট আছে?",swap:"লগ ইন করুন"},name:"আপনার পুরো নাম",email:"ইমেইল ঠিকানা",password:"পাসওয়ার্ড",confirm:"পাসওয়ার্ড নিশ্চিত করুন",show:"দেখুন",hide:"লুকান",strength:"অন্তত ১২ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।",error:"কাজটি সম্পন্ন হয়নি",back:"হোমে ফিরুন",privacy:"পাসওয়ার্ড শুধুমাত্র সার্ভারে যাচাই করা হয়। কাউকে পাসওয়ার্ড দেবেন না।",pending:"অপেক্ষা করুন…"}
} as const;

function Submit({label,loading}:{label:string;loading:string}){
 const {pending}=useFormStatus();
 return <button className="button-primary auth-submit" type="submit" disabled={pending}>{pending?loading:label}<span aria-hidden="true">{pending?"◷":"↗"}</span></button>;
}
export function AuthForm({locale,mode}:{locale:Locale;mode:"login"|"register"}){
 const t=copy[locale],p=t[mode];
 const action=mode==="login"?loginAction.bind(null,locale):registerAction.bind(null,locale);
 const [state,formAction]=useActionState<FormErrorState,FormData>(action,emptyState);
 const [show,setShow]=useState(false);
 const [toast,setToast]=useState("");
 useEffect(()=>{if(state.status==="error")setToast(state.message);},[state]);
 return <main className="auth-main ek-auth-main"><div className="auth-shell">
  <div className="auth-intro"><p className="eyebrow"><span className="eyebrow-line"/>EKMIVO / ACCOUNT</p><h1>{p.title}</h1><p>{p.subtitle}</p>
   <div className="ek-auth-benefits"><span>01 / AI COMMUNICATION</span><span>02 / COMMERCE & PAYMENTS</span><span>03 / WORKSPACE CONTROL</span></div>
  </div>
  <div className="auth-card ek-auth-card">
   <div className="auth-card-top"><span className="auth-card-mark">e<span>.</span></span><span>{mode==="login"?"01 / SIGN IN":"02 / REGISTER"}</span></div>
   <h2>{p.title}</h2><p className="auth-note">{p.subtitle}</p>
   <form action={formAction} noValidate={false}>
    {mode==="register"&&<label>{t.name}<input name="name" type="text" autoComplete="name" minLength={2} maxLength={100} placeholder={t.name} required aria-invalid={!!state.fields?.name}/>{state.fields?.name&&<small className="ek-field-error">{state.fields.name}</small>}</label>}
    <label>{t.email}<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={254} aria-invalid={!!state.fields?.email}/>{state.fields?.email&&<small className="ek-field-error">{state.fields.email}</small>}</label>
    <label>{t.password}<span className="password-field"><input name="password" type={show?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} required minLength={mode==="register"?12:1} maxLength={256} aria-invalid={!!state.fields?.password}/><button type="button" aria-label={show?t.hide:t.show} onClick={()=>setShow(x=>!x)}>{show?t.hide:t.show}</button></span>{mode==="register"&&<small className="ek-field-hint">{t.strength}</small>}{state.fields?.password&&<small className="ek-field-error">{state.fields.password}</small>}</label>
    {mode==="register"&&<label>{t.confirm}<input name="confirm" type={show?"text":"password"} autoComplete="new-password" minLength={12} required aria-invalid={!!state.fields?.confirm}/>{state.fields?.confirm&&<small className="ek-field-error">{state.fields.confirm}</small>}</label>}
    {state.status==="error"&&<p role="alert" className="ek-form-error">{state.message}</p>}
    <Submit label={p.submit} loading={t.pending}/>
   </form>
   <div className="auth-switch"><span>{p.bottom}</span> <Link href={`/${locale}/${mode==="login"?"register":"login"}`}>{p.swap} ↗</Link></div>
   <small className="ek-auth-disclaimer">{t.privacy}</small>
  </div>
  <Link className="auth-back" href={`/${locale}`}>← {t.back}</Link>
 </div>
 {toast&&<div className="ek-toast" role="alert"><span>{t.error}</span><p>{toast}</p><button type="button" onClick={()=>setToast("")} aria-label="Dismiss">×</button></div>}
 </main>;
}
