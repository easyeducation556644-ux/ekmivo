"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
type Theme = "system" | "light" | "dark";
export function SiteControls({locale,initialTheme}:{locale:"bn"|"en";initialTheme:Theme}){
 const pathname=usePathname(),router=useRouter();
 const [theme,setTheme]=useState<Theme>(initialTheme);
 useEffect(()=>{
  const onStorage=(event:StorageEvent)=>{
   if(event.key!=="ekmivo-theme-preference")return;
   const next=event.newValue==="light"||event.newValue==="dark"?event.newValue:"system";
   setTheme(next);
   if(next==="system")document.documentElement.removeAttribute("data-theme");
   else document.documentElement.dataset.theme=next;
   document.cookie=`ekmivo-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };
  window.addEventListener("storage",onStorage);
  return ()=>window.removeEventListener("storage",onStorage);
 },[]);
 function changeTheme(next:Theme){
  setTheme(next);
  if(next==="system")document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme=next;
  document.cookie=`ekmivo-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try{window.localStorage.setItem("ekmivo-theme-preference",next);}catch{/* Cookie and React state still work. */}
 }
 // Persist locale only after navigation truly commits, including a guarded
 // Save draft / Discard / Stay decision. Cancelling must not change cookies.
 useEffect(()=>{
  document.documentElement.lang=locale;
  document.cookie=`ekmivo-locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
 },[locale]);
 function changeLocale(next:"bn"|"en"){
  if(next===locale)return;
  // Query params (especially payment environment, page cursors and filters)
  // are part of the context. Do not drop them on an EN/BN switch.
  const href=pathname.replace(/^\/(bn|en)(?=\/|$)/,`/${next}`)+window.location.search+window.location.hash;
  const intent=new CustomEvent("ekmivo:guarded-navigation",{cancelable:true,detail:{href}});
  if(!window.dispatchEvent(intent))return;
  // Only an accepted navigation may persist the new preference.
  document.cookie=`ekmivo-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  router.push(href);
 }
 return <>
  <label htmlFor="site-locale" className="sr-only">{locale==="bn"?"ভাষা":"Language"}</label>
  <select id="site-locale" className="select-control" value={locale} aria-label={locale==="bn"?"ভাষা নির্বাচন":"Select language"} onChange={event=>changeLocale(event.target.value as "bn"|"en")}>
   <option value="bn">বাংলা</option><option value="en">EN</option>
  </select>
  <label htmlFor="site-theme" className="sr-only">{locale==="bn"?"রঙের ধরন":"Theme"}</label>
  <select id="site-theme" className="select-control" value={theme} aria-label={locale==="bn"?"লাইট, ডার্ক বা সিস্টেম":"Light, dark or system"} onChange={event=>changeTheme(event.target.value as Theme)}>
   <option value="system">{locale==="bn"?"সিস্টেম":"System"}</option>
   <option value="light">{locale==="bn"?"হালকা":"Light"}</option>
   <option value="dark">{locale==="bn"?"গাঢ়":"Dark"}</option>
  </select>
 </>;
}
