"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { sections, type SectionKey } from "../lib/dashboard-sections";
import { dashboardHref, navigation, searchableNavigation, serviceEnabled, serviceNames, sectionInService, type Locale, type Service, type PaymentEnvironment } from "../lib/dashboard-navigation";
import { DashboardIcon as Icon } from "./dashboard-icon";
import { SiteControls } from "./site-controls";

type Space = { id: string; name: string; mode: "ai" | "commerce" | "both"; role: "owner" | "admin" | "editor" | "viewer" };
type PaymentContext = { environment: PaymentEnvironment; status: "active" | "suspended"; availableEnvironments: PaymentEnvironment[]; liveOperational: false };
type Props = { locale: Locale; service: Service; section: SectionKey; workspace: Space; spaces: Space[]; userName: string; platformAdmin: boolean; theme: "light" | "dark" | "system"; paymentContext?: PaymentContext; children: React.ReactNode; logout: React.ReactNode };
const memoryKey=(workspaceId:string,service:Service)=>`ekmivo-last:${workspaceId}:${service}`;
function rememberedSection(workspaceId:string,service:Service): SectionKey {
 try {
  const stored=window.localStorage.getItem(memoryKey(workspaceId,service));
  if(stored&&sectionInService(service,stored))return stored;
 }catch{ /* Browser storage unavailable: safe overview fallback. */ }
 return "overview";
}
export function DashboardFrame({ locale, service, section, workspace, spaces, userName, platformAdmin, theme, paymentContext, children, logout }: Props) {
 const bn=locale==="bn",router=useRouter(),pathname=usePathname();
 const environment=paymentContext?.environment??"sandbox";
 const [mobileOpen,setMobileOpen]=useState(false);
 const [businessQuery,setBusinessQuery]=useState("");
 const [sidebarQuery,setSidebarQuery]=useState("");
 const [globalQuery,setGlobalQuery]=useState("");
 const [activeResult,setActiveResult]=useState(0);
 const [searchOpen,setSearchOpen]=useState(false);
 const [isNavigating,setIsNavigating]=useState(false);
 const [noticeOpen,setNoticeOpen]=useState(false);
 const drawer=useRef<HTMLDialogElement>(null);
 const searchDialog=useRef<HTMLDialogElement>(null);
 const serviceMenu=useRef<HTMLDetailsElement>(null);
 const businessMenu=useRef<HTMLDetailsElement>(null);
 const groups=sidebarQuery?searchableNavigation(service,sidebarQuery):navigation[service];
 const foundGroups=searchableNavigation(service,globalQuery);
 const foundKeys=foundGroups.flatMap(group=>group.items);
 const visibleBusinesses=spaces.filter(space=>space.name.toLocaleLowerCase().includes(businessQuery.trim().toLocaleLowerCase()));
 const contextHref=useCallback((key:SectionKey,product:Service=service,businessId:string=workspace.id,env:PaymentEnvironment=environment)=>dashboardHref(locale,businessId,product,key,env),[locale,workspace.id,service,environment]);

 const goTo=useCallback((businessId:string,product:Service,env:PaymentEnvironment,nextSection:SectionKey)=>{
  setIsNavigating(true);
  setMobileOpen(false);
  setSearchOpen(false);
  if(serviceMenu.current)serviceMenu.current.open=false;
  if(businessMenu.current)businessMenu.current.open=false;
  router.push(dashboardHref(locale,businessId,product,nextSection,env));
 },[locale,router]);

 useEffect(()=>{
  try{window.localStorage.setItem(memoryKey(workspace.id,service),section);}catch{/* Non-essential preference. */}
  setIsNavigating(false);
 },[pathname,section,workspace.id,service,environment]);
 useEffect(()=>{
  const d=drawer.current;
  if(mobileOpen && d && !d.open)d.showModal();
  if(!mobileOpen && d?.open)d.close();
  return ()=>{if(d?.open)d.close();};
 },[mobileOpen]);
 useEffect(()=>{
  const d=searchDialog.current;
  if(searchOpen && d && !d.open)d.showModal();
  if(!searchOpen && d?.open)d.close();
  return ()=>{if(d?.open)d.close();};
 },[searchOpen]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLocaleLowerCase()==="k"){
    event.preventDefault();setSearchOpen(true);
   }
   if(event.key==="Escape"){
    if(serviceMenu.current)serviceMenu.current.open=false;
    if(businessMenu.current)businessMenu.current.open=false;
   }
  };
  const dismiss=(event:PointerEvent)=>{
   const target=event.target as Node;
   for(const ref of [serviceMenu,businessMenu]) if(ref.current&&!ref.current.contains(target))ref.current.open=false;
  };
  document.addEventListener("keydown",key);
  document.addEventListener("pointerdown",dismiss);
  return ()=>{document.removeEventListener("keydown",key);document.removeEventListener("pointerdown",dismiss);};
 },[]);
 const switchProduct=(target:Service)=>{
  if(target===service)return;
  if(!serviceEnabled(target,workspace.mode))return;
  const remembered=rememberedSection(workspace.id,target);
  goTo(workspace.id,target,target==="payments"?"sandbox":environment,remembered);
 };
 const switchBusiness=(target:Space)=>{
  if(target.id===workspace.id){setMobileOpen(false);if(businessMenu.current)businessMenu.current.open=false;return;}
  const chosen=serviceEnabled(service,target.mode)?service:(target.mode==="ai"?"ai":"payments");
  goTo(target.id,chosen,chosen==="payments"?"sandbox":environment,rememberedSection(target.id,chosen));
 };
 const nav=(key:SectionKey)=>{
  goTo(workspace.id,service,environment,key);
 };
 const sidebar=(mobile=false)=><>
  <div className="ds-brand-row">
   <Link href={`/${locale}`} className="ek-wordmark">ekmivo<span>.</span></Link>
   <span className="ds-product-tag">{service==="ai"?"AI":"PAY"}</span>
   {mobile&&<button type="button" className="ds-icon-button" aria-label={bn?"মেনু বন্ধ করুন":"Close menu"} onClick={()=>setMobileOpen(false)}><Icon name="close"/></button>}
  </div>
  <details className="ds-business-picker" ref={mobile?undefined:businessMenu}>
   <summary><span className="ds-business-avatar">{workspace.name.slice(0,1).toUpperCase()}</span><span><small>{bn?"বর্তমান ব্যবসা":"Current business"}</small><strong>{workspace.name}</strong></span><Icon name="chevron"/></summary>
   <div className="ds-business-menu">
    <label className="ds-switch-search"><span className="sr-only">{bn?"ব্যবসা খুঁজুন":"Find business"}</span><input value={businessQuery} onChange={event=>setBusinessQuery(event.target.value)} placeholder={bn?"ব্যবসা খুঁজুন…":"Search businesses…"} /></label>
    {visibleBusinesses.map(space=><button key={space.id} type="button" aria-current={space.id===workspace.id?"true":undefined} onClick={()=>switchBusiness(space)}><span className="ds-business-avatar">{space.name.slice(0,1).toUpperCase()}</span><span><strong>{space.name}</strong><small>{space.role}{space.id===workspace.id?(bn?" · বর্তমান":" · Current"):""}</small></span>{space.id===workspace.id&&<Icon name="check"/>}</button>)}
    {!visibleBusinesses.length&&<p className="ds-no-match" role="status">{bn?"কোনো ব্যবসা পাওয়া যায়নি":"No businesses match"}</p>}
    <Link href={`/${locale}/workspaces`} onClick={()=>setMobileOpen(false)}><Icon name="plus"/>{bn?"ব্যবসা পরিচালনা / নতুন ব্যবসা":"Manage / create businesses"}</Link>
   </div>
  </details>
  <label className="ds-nav-search"><Icon name="search"/><span className="sr-only">{bn?"মেনু খুঁজুন":"Find a page"}</span><input value={sidebarQuery} onChange={event=>setSidebarQuery(event.target.value)} placeholder={bn?"মেনু খুঁজুন…":"Find a page…"}/></label>
  <nav className="ds-navigation" aria-label={bn?`${serviceNames[service].bn} নেভিগেশন`:`${serviceNames[service].en} navigation`}>
   {groups.map(group=><section className="ds-nav-section" key={group.label.en}>
    <h2>{group.label[locale]}</h2>
    {group.items.map(key=><Link key={key} href={contextHref(key)} className={section===key?"is-current":undefined} aria-current={section===key?"page":undefined} onClick={event=>{event.preventDefault();nav(key);}}>
     <Icon name={key}/><span>{sections[key][locale]}</span>{section===key&&<span className="ds-active-mark"/>}</Link>)}
   </section>)}
   {!groups.length&&<p className="ds-search-empty" role="status">{bn?"কোনো মেনু পাওয়া যায়নি।":"No matching pages."}</p>}
  </nav>
  <div className="ds-sidebar-foot">
   {platformAdmin&&<Link href={`/${locale}/admin`}><Icon name="shield"/>{bn?"প্ল্যাটফর্ম অ্যাডমিন":"Platform admin"}</Link>}
   {logout}
   <div className="ds-signed-in"><span className="ds-person-avatar">{userName.slice(0,1).toUpperCase()}</span><span><strong>{userName}</strong><small>{bn?"আপনার অ্যাকাউন্ট":"Your account"}</small></span></div>
  </div>
 </>;
 return <div className="ds-app" data-service={service} data-environment={environment}>
  <a className="ds-skip" href="#dashboard-content">{bn?"মূল অংশে যান":"Skip to content"}</a>
  <aside className="ds-sidebar">{sidebar()}</aside>
  <dialog ref={drawer} className="ds-mobile-dialog" aria-label={bn?"ওয়ার্কস্পেস মেনু":"Workspace menu"} onCancel={()=>setMobileOpen(false)} onClose={()=>setMobileOpen(false)}>{sidebar(true)}</dialog>
  <div className="ds-main">
   <header className="ds-topbar">
    <div className="ds-topbar-leading">
     <button type="button" className="ds-icon-button ds-mobile-trigger" aria-label={bn?"মেনু খুলুন":"Open menu"} aria-haspopup="dialog" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(true)}><Icon name="menu"/></button>
     <details className="ds-service-picker" ref={serviceMenu}>
      <summary><span className="ds-service-icon"><Icon name={service==="ai"?"ai-agent":"payments"}/></span><span><small>{bn?"সেবা নির্বাচন":"Product"}</small><strong>{serviceNames[service][locale]}</strong></span><Icon name="chevron"/></summary>
      <div className="ds-service-menu">
       <p>{bn?"সেবা পরিবর্তন করুন":"Switch product"}</p>
       {(["payments","ai"] as Service[]).map(item=>{
        const enabled=serviceEnabled(item,workspace.mode);
        return <button type="button" key={item} disabled={!enabled} aria-current={service===item?"true":undefined} onClick={()=>switchProduct(item)}>
         <span className="ds-service-icon"><Icon name={item==="ai"?"ai-agent":"payments"}/></span>
         <span><strong>{serviceNames[item][locale]}</strong><small>{item==="ai"?(bn?"চ্যাট, AI ও লিড · তৈরির কাজ চলছে":"Inbox, AI and leads · In development"):(bn?"পেমেন্ট ও ডিভাইস · সেটআপ প্রয়োজন":"Payments and devices · Setup required")}</small></span>
         {service===item?<Icon name="check"/>:<small>{enabled?"↗":(bn?"অ্যাক্সেস নেই":"Not available")}</small>}
        </button>;
       })}
       <p className="ds-service-note">{bn?"ব্যবসা অপরিবর্তিত থাকবে; আগের পৃষ্ঠা মনে রাখা হবে।":"Business stays selected. Your last page is remembered."}</p>
      </div>
     </details>
     {service==="payments"&&<label className="ds-environment-picker">
      <span className="sr-only">{bn?"পেমেন্ট পরিবেশ":"Payment environment"}</span>
      <select value={environment} onChange={event=>{
       const next=event.target.value as PaymentEnvironment;
       if(!paymentContext?.availableEnvironments.includes(next))return;
       goTo(workspace.id,service,next,"overview");
      }}>
       {(["sandbox","live"] as PaymentEnvironment[]).map(item=><option key={item} value={item} disabled={!paymentContext?.availableEnvironments.includes(item)}>{item==="sandbox"?"Sandbox":"Live"}</option>)}
      </select>
     </label>}
    </div>
    <div className="ds-topbar-tools">
     <button type="button" className="ds-global-search-button" onClick={()=>{setSearchOpen(true);setGlobalQuery("");setActiveResult(0);}}><Icon name="search"/><span>{bn?"খুঁজুন":"Search"}</span><kbd>⌘ K</kbd></button>
     <SiteControls locale={locale} initialTheme={theme}/>
     <details className="ds-notifications" open={noticeOpen} onToggle={event=>setNoticeOpen(event.currentTarget.open)}>
      <summary className="ds-icon-button" aria-label={bn?"নোটিফিকেশন":"Notifications"}><Icon name="bell"/></summary>
      <div className="ds-notifications-menu"><strong>{bn?"নোটিফিকেশন":"Notifications"}</strong><p>{bn?"ইভেন্ট সেবা এখনো সংযুক্ত হয়নি; কোনো unread count দেখানো হচ্ছে না।":"The event service is not connected; unread counts are unavailable."}</p></div>
     </details>
     <Link className="ds-help-link" href={contextHref("help")} aria-label={bn?"সহায়তা":"Help"}><Icon name="help"/></Link>
    </div>
   </header>
   {service==="payments"&&<div className={environment==="sandbox"?"ds-env-banner":"ds-env-banner is-live"} role="status">
    <strong>{environment==="sandbox"?(bn?"Sandbox · আলাদা পরীক্ষার পরিবেশ":"Sandbox · Isolated test environment"):(bn?"Live · সেটআপ অসম্পূর্ণ":"Live · Setup incomplete")}</strong>
    <span>{environment==="sandbox"?(bn?"এটি live টাকা গ্রহণ নয়; কোনো পেমেন্ট যাচাই বা webhook চালু নেই।":"This is not real money. Payment verification and webhooks are not enabled."):(bn?"Live payment চালু হয়নি। Receiving account, ডিভাইস, API ও security পরীক্ষা বাকি।":"Live payments are not enabled. Receiving sources, devices, APIs and security checks are pending.")}</span>
    {environment==="live"&&<Link href={contextHref("gateways")}>{bn?"সেটআপ দেখুন":"View setup"} ↗</Link>}
   </div>}
   <div className="ds-breadcrumb"><span>{workspace.name}</span><Icon name="chevron"/><span>{serviceNames[service][locale]}</span><Icon name="chevron"/><strong>{sections[section][locale]}</strong></div>
   {isNavigating&&<div className="ds-navigation-progress" role="status">{bn?"পৃষ্ঠা খুলছে…":"Opening page…"}</div>}
   <main id="dashboard-content" className="ds-content" tabIndex={-1}>{children}</main>
   <footer className="ds-footnote"><span>{serviceNames[service][locale]} · {workspace.name}</span><span>Asia/Dhaka</span></footer>
  </div>
  <dialog ref={searchDialog} className="ds-search-dialog" aria-label={bn?"ওয়ার্কস্পেস খুঁজুন":"Search workspace"} onCancel={()=>setSearchOpen(false)} onClose={()=>setSearchOpen(false)}>
   <div className="ds-search-top"><Icon name="search"/><input autoFocus value={globalQuery} onChange={event=>{setGlobalQuery(event.target.value);setActiveResult(0);}} placeholder={bn?"এই সেবার পৃষ্ঠা খুঁজুন…":"Search this product's pages…"} aria-label={bn?"পৃষ্ঠা খুঁজুন":"Find a page"}
     onKeyDown={event=>{
      if(event.key==="ArrowDown"){event.preventDefault();setActiveResult(i=>foundKeys.length?(i+1)%foundKeys.length:0);}
      if(event.key==="ArrowUp"){event.preventDefault();setActiveResult(i=>foundKeys.length?(i+foundKeys.length-1)%foundKeys.length:0);}
      if(event.key==="Enter"&&foundKeys[activeResult]){event.preventDefault();nav(foundKeys[activeResult]);}
     }}/><button type="button" className="ds-icon-button" onClick={()=>setSearchOpen(false)} aria-label={bn?"বন্ধ করুন":"Close search"}><Icon name="close"/></button></div>
   <div className="ds-search-results" role="listbox" aria-label={bn?"ফলাফল":"Results"}>
    {foundKeys.map((key,index)=><button type="button" role="option" aria-selected={activeResult===index} onMouseEnter={()=>setActiveResult(index)} key={key} onClick={()=>nav(key)}><Icon name={key}/><span>{sections[key][locale]}</span><small>{serviceNames[service][locale]}</small></button>)}
    {!foundKeys.length&&<p role="status">{bn?"কোনো পৃষ্ঠা পাওয়া যায়নি":"No matching pages"}</p>}
   </div>
   <p className="ds-search-hint">{bn?"এই সার্চে শুধু বর্তমান সেবার পৃষ্ঠা পাওয়া যাবে; লেনদেন খোঁজার API এখনো তৈরি হয়নি।":"Navigation search is scoped to this product. Record search is unavailable until its API is implemented."}</p>
  </dialog>
 </div>;
}
