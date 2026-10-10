"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { siteCopy } from "../lib/site-copy";
import type { Locale } from "../lib/site-copy";

type Mode = "login" | "register";

const copy = {
  en: {
    login: { eyebrow: "WELCOME BACK", title: "Good to see you again.", intro: "Your workspace will be ready here when account access opens.", submit: "Continue to workspace", alternative: "New to Ekmivo?", alternativeLink: "Create an account" },
    register: { eyebrow: "YOUR WORKSPACE STARTS HERE", title: "Make room for better work.", intro: "One place for customer conversations and commerce operations.", submit: "Create account", alternative: "Already have an account?", alternativeLink: "Log in" },
    name: "Your name", namePlaceholder: "Full name", email: "Work email", emailPlaceholder: "you@company.com", password: "Password", passwordPlaceholder: "At least 8 characters", confirm: "Confirm password", show: "Show password", hide: "Hide password", mismatch: "Passwords do not match.", unavailable: "Account access is being set up. Your details were not sent or saved. Please check back soon.", note: "Account access is not open yet. This form is a preview of the sign-in flow.", home: "Back to home",
  },
  bn: {
    login: { eyebrow: "আবার স্বাগতম", title: "আপনাকে আবার পেয়ে ভালো লাগছে।", intro: "অ্যাকাউন্ট চালু হলে এখান থেকেই ওয়ার্কস্পেসে ঢুকতে পারবেন।", submit: "ওয়ার্কস্পেসে যান", alternative: "Ekmivo-তে নতুন?", alternativeLink: "অ্যাকাউন্ট তৈরি করুন" },
    register: { eyebrow: "আপনার ওয়ার্কস্পেস শুরু হোক", title: "কাজের জন্য নতুন জায়গা তৈরি করুন।", intro: "কাস্টমারের কথোপকথন ও কমার্স পরিচালনার এক জায়গা।", submit: "অ্যাকাউন্ট তৈরি করুন", alternative: "আগে থেকেই অ্যাকাউন্ট আছে?", alternativeLink: "লগ ইন করুন" },
    name: "আপনার নাম", namePlaceholder: "পুরো নাম", email: "কাজের ইমেইল", emailPlaceholder: "you@company.com", password: "পাসওয়ার্ড", passwordPlaceholder: "অন্তত ৮টি অক্ষর", confirm: "পাসওয়ার্ড নিশ্চিত করুন", show: "পাসওয়ার্ড দেখুন", hide: "পাসওয়ার্ড লুকান", mismatch: "পাসওয়ার্ড দুটি মিলছে না।", unavailable: "অ্যাকাউন্ট চালু করার কাজ চলছে। আপনার তথ্য পাঠানো বা সংরক্ষণ করা হয়নি। কিছুদিন পরে আবার দেখুন।", note: "অ্যাকাউন্ট এখনো চালু হয়নি। এখানে প্রবেশের ফর্মের নকশা দেখানো হয়েছে।", home: "হোমে ফিরুন",
  },
} as const;

export function AuthForm({ locale, mode }: { locale: Locale; mode: Mode }) {
  const t = copy[locale];
  const page = t[mode];
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (mode === "register" && data.get("password") !== data.get("confirm")) {
      setMessage(t.mismatch);
      return;
    }
    setMessage(t.unavailable);
  }

  return <main className="auth-main"><div className="auth-atmosphere" aria-hidden="true"><span /><span /><span /></div><div className="auth-shell"><div className="auth-intro"><p className="eyebrow"><span className="eyebrow-line" />{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p><div className="auth-orbit" aria-hidden="true"><div /><div /><span>EKMIVO</span></div></div><div className="auth-card"><div className="auth-card-top"><span className="auth-card-mark">e<span>.</span></span><span>{mode === "login" ? "01 / LOGIN" : "02 / REGISTER"}</span></div><h2>{mode === "login" ? siteCopy[locale].login : siteCopy[locale].register}</h2><p className="auth-note">{t.note}</p><form onSubmit={submit}>
    {mode === "register" && <label>{t.name}<input name="name" type="text" autoComplete="name" placeholder={t.namePlaceholder} required minLength={2} /></label>}
    <label>{t.email}<input name="email" type="email" autoComplete="email" placeholder={t.emailPlaceholder} required /></label>
    <label>{t.password}<span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={t.passwordPlaceholder} required minLength={8} /><button type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? t.hide : t.show}>{showPassword ? "◉" : "◎"}</button></span></label>
    {mode === "register" && <label>{t.confirm}<input name="confirm" type="password" autoComplete="new-password" placeholder={t.passwordPlaceholder} required minLength={8} /></label>}
    <button className="button-primary auth-submit" type="submit">{page.submit}<span aria-hidden="true">↗</span></button>
    {message && <p className="auth-message" role="status">{message}</p>}
  </form><div className="auth-switch"><span>{page.alternative}</span><Link href={`/${locale}/${mode === "login" ? "register" : "login"}`}>{page.alternativeLink} ↗</Link></div></div><Link className="auth-back" href={`/${locale}`}>← {t.home}</Link></div></main>;
}
