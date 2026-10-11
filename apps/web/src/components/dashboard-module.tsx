"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardIcon as Icon } from "./dashboard-icon";
import { type Locale, type Service, type PaymentEnvironment } from "../lib/dashboard-navigation";
import { sections, type SectionKey } from "../lib/dashboard-sections";
import type { ModuleView } from "../lib/dashboard-views";
export function DashboardModule({locale,section,view}:{locale:Locale;service:Service;workspaceId:string;section:SectionKey;view:ModuleView;environment?:PaymentEnvironment}) {
 const [tab,setTab]=useState(0),bn=locale==="bn",router=useRouter();
 return <section className="ds-panel ds-module">
  <div className="ds-tabs" role="tablist" aria-label={sections[section][locale]}>{view.tabs.map((item,index)=><button type="button" role="tab" key={item.en} id={`module-tab-${index}`} aria-selected={tab===index} aria-controls="module-panel" tabIndex={tab===index?0:-1} onClick={()=>setTab(index)} onKeyDown={event=>{if(["ArrowRight","ArrowLeft","Home","End"].includes(event.key)){event.preventDefault();const target=event.key==="Home"?0:event.key==="End"?view.tabs.length-1:(tab+(event.key==="ArrowRight"?1:-1)+view.tabs.length)%view.tabs.length;setTab(target);document.getElementById(`module-tab-${target}`)?.focus();}}}>{item[locale]}</button>)}</div>
  <div id="module-panel" role="tabpanel" aria-labelledby={`module-tab-${tab}`} tabIndex={0}>
   <div className="ds-module-toolbar"><span>{view.tabs[tab][locale]}</span><span className="ds-availability">{bn?"ডেটা সেবা এখনো চালু নয়":"Data source unavailable"}</span></div>
   {view.providers?<div className="ds-connections">{view.providers.map(provider=><article key={provider}><span className="ds-provider-icon"><Icon name={section}/></span><div><h2>{provider}</h2><p>{bn?"সোর্স সংযুক্ত নয়":"Source not connected"}</p></div><span className="ds-availability">{bn?"Integration প্রস্তুত হচ্ছে":"Integration in development"}</span></article>)}</div>:view.columns.length>0?<div className="ds-table-scroll"><table className="ds-table"><caption className="sr-only">{sections[section][locale]} — {view.tabs[tab][locale]}</caption><thead><tr>{view.columns.map(column=><th scope="col" key={column.en}>{column[locale]}</th>)}</tr></thead><tbody><tr><td colSpan={view.columns.length}><div className="ds-empty"><Icon name={section}/><h2>{bn?"ডেটা সেবা উপলব্ধ নয়":"Data service unavailable"}</h2><p>{view.empty[locale]}</p><span className="ds-availability" aria-disabled="true">{bn?"এই কাজ এখনো চালু হয়নি":"This action is not yet available"}</span></div></td></tr></tbody></table></div>:<div className="ds-empty"><Icon name={section}/><h2>{sections[section][locale]}</h2><p>{view.empty[locale]}</p><span className="ds-availability" aria-disabled="true">{bn?"এই কাজ এখনো চালু হয়নি":"This action is not yet available"}</span></div>}
   <div role="status" aria-live="polite" className="ds-module-status">
    <p>{bn?"ডেটা সার্ভিস এখনো উপলব্ধ নয়। ফলে প্রকৃত record count, payment status, live search, export বা mutation যাচাই করা যাচ্ছে না। এখানে ০ দেখানো মানে ভুলভাবে কোনো record নেই দাবি করা হবে।":"The data service is not available yet. No real record counts, payment status, live search, exports or mutations can be verified. An unknown total is not zero."}</p>
    <button type="button" className="ds-route-retry" onClick={()=>router.refresh()}>{bn?"সার্ভারের অবস্থা আবার যাচাই":"Retry service status"} ↻</button>
   </div>
  </div>
 </section>;
}
