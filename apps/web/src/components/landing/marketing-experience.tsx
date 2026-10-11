"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { landingCopy, type LandingLocale } from "../../lib/landing-content";
import { FeatureVisual } from "./feature-visual";

function Eyebrow({children}:{children:React.ReactNode}) {return <p className="v3-eyebrow"><span aria-hidden="true"/> {children}</p>;}
function SectionHeading({eyebrow,title,lead}:{eyebrow:string;title:string;lead?:string}) {
 return <div className="v3-section-heading" data-reveal><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{lead&&<p>{lead}</p>}</div>;
}

function subscribeReducedMotion(onChange: () => void) {
 const media = window.matchMedia("(prefers-reduced-motion: reduce)");
 media.addEventListener("change", onChange);
 return () => media.removeEventListener("change", onChange);
}
function getReducedMotion() {
 return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getServerReducedMotion() { return true; }
export function MarketingExperience({locale}:{locale:LandingLocale}) {
 const t=landingCopy[locale];
 const [heroIndex,setHeroIndex]=useState(0);
 const [playing,setPlaying]=useState(true);
 const reduceMotion=useSyncExternalStore(subscribeReducedMotion,getReducedMotion,getServerReducedMotion);
 const autoplay=playing&&!reduceMotion;
 const [story,setStory]=useState(0);
 const [service,setService]=useState(2);
 const [scenario,setScenario]=useState(0);
 const [solution,setSolution]=useState(0);

 useEffect(()=>{
   if(!autoplay)return;
   const timer=window.setInterval(()=>setHeroIndex(prev=>(prev+1)%4),4100);
   return ()=>window.clearInterval(timer);
 },[autoplay]);

 useEffect(()=>{
   if(reduceMotion)return;
   const visibleObserver=new IntersectionObserver(entries=>{
     for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add("is-visible");visibleObserver.unobserve(entry.target);}
   },{threshold:.07,rootMargin:"0px 0px -25px 0px"});
   document.querySelectorAll(".v3 [data-reveal]").forEach(el=>visibleObserver.observe(el));
   document.documentElement.classList.add("v3-motion-ready");
   return ()=>{visibleObserver.disconnect();document.documentElement.classList.remove("v3-motion-ready");};
 },[reduceMotion]);

 useEffect(()=>{
  const chapters=document.querySelectorAll(".v3-story-step");
  const observer=new IntersectionObserver(entries=>{
   const hits=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
   if(hits[0])setStory(Number(hits[0].target.getAttribute("data-scene")));
  },{rootMargin:"-27% 0px -43% 0px",threshold:0});
  chapters.forEach(ch=>observer.observe(ch));
  return ()=>observer.disconnect();
 },[]);

 const hero=t.heroPhases[heroIndex], chapter=t.journey[story];
 return <main className="v3" id="main">
   <section className="v3-hero" id="top" aria-labelledby="v3-hero-title">
    <div className="v3-grid-background" aria-hidden="true"/>
    <div className="v3-hero-glow" aria-hidden="true"/>
    <div className="v3-wrap v3-hero-grid">
     <div className="v3-hero-copy">
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <h1 id="v3-hero-title">{t.headline.map(line=><span key={line}>{line}</span>)}<em>{t.accent}</em></h1>
      <p className="v3-hero-intro">{t.intro}</p>
      <div className="v3-hero-actions"><a className="v3-btn v3-btn-accent" href="#services">{t.explore}<span aria-hidden="true">↗</span></a><a className="v3-btn v3-btn-ghost" href="#workflow"><span className="v3-circle-play" aria-hidden="true">▶</span>{t.watch}</a></div>
      <div className="v3-hero-micro"><span className="v3-micro-icon">✳</span><span>{t.heroNote}</span></div>
     </div>
     <div className="v3-hero-art">
      <div className="v3-floating-badge v3-badge-left"><i className="v3-glow-dot"/><span>AI + COMMERCE</span></div>
      <div className="v3-product-frame">
       <div className="v3-frame-toolbar"><span className="v3-frame-brand"><b>e</b>kmivo<span>.</span></span><span className="v3-frame-address">workspace / concept</span><span className="v3-frame-dots"><i/><i/><i/></span></div>
       <div className="v3-frame-interior">
        <div className="v3-frame-rail"><span className="selected">◈</span><span>☰</span><span>▦</span><span>◷</span><span>▤</span><span>⚙</span></div>
        <div className="v3-frame-main">
         <div className="v3-frame-super"><span>{t.demo}</span><span>EKMIVO / 01</span></div>
         <div className="v3-frame-heading"><div><small>THE CONNECTED FLOW</small><h3>{hero.title}</h3></div><span className="v3-frame-status"><i/>{hero.meta}</span></div>
         <div className="v3-flow-path"><span className={heroIndex>=0?"active":""}>MESSAGE</span><b>→</b><span className={heroIndex>=1?"active":""}>AI</span><b>→</b><span className={heroIndex>=2?"active":""}>ORDER</span><b>→</b><span className={heroIndex>=3?"active":""}>PAYMENT</span></div>
         <div className="v3-frame-conversation" aria-live="off"><span className="v3-conversation-label">{hero.stage}</span><div className="v3-frame-chat-row"><span className="v3-chat-avatar">C</span><p key={hero.message}>{hero.message}</p></div><div className="v3-frame-chat-row reply"><p key={hero.reply}>{hero.reply}</p><span className="v3-ai-avatar">✳</span></div></div>
         <div className="v3-frame-bottom-cards"><div><small>CHANNEL</small><strong>Omnichannel</strong><span>↗</span></div><div><small>ACTIVITY</small><strong>{hero.meta}</strong><span className="v3-green-dot">●</span></div></div>
        </div>
       </div>
      </div>
      <div className="v3-floating-badge v3-badge-right"><span className="v3-badge-check">✓</span><div><small>CONNECTED WORKFLOW</small><strong>{hero.stage}</strong></div></div>
      <div className="v3-demo-controls"><div className="v3-progress-dots">{t.heroPhases.map((s,i)=><button type="button" key={s.stage} className={i===heroIndex?"is-active":""} onClick={()=>setHeroIndex(i)} aria-label={`${t.step} ${i+1}: ${s.title}`} aria-pressed={i===heroIndex}/>)}</div><button type="button" className="v3-play-toggle" disabled={reduceMotion} aria-label={autoplay?t.pause:t.play} onClick={()=>setPlaying(v=>!v)}>{autoplay?"Ⅱ":"▶"} <span>{autoplay?t.pause:t.play}</span></button></div>
     </div>
    </div>
    <div className="v3-hero-bottom v3-wrap"><span>01 / 22 — EKMIVO</span><span>{t.sampleCaption}</span><a href="#workflow" aria-label={t.watch}>SCROLL TO EXPLORE ↓</a></div>
   </section>

   <div className="v3-capability-rail" aria-label={t.included}><div className="v3-rail-track">{[...t.rail,...t.rail].map((label,i)=><span key={i}><i/> {label}</span>)}</div></div>

   <section className="v3-journey v3-section" id="workflow" aria-labelledby="journey-title">
    <div className="v3-wrap">
     <SectionHeading eyebrow={t.journeyTag} title={t.journeyTitle} lead={t.journeyLead}/>
     <div className="v3-story-layout">
      <div className="v3-story-copy">
       {t.journey.map((scene,i)=><article key={scene.tag} className={`v3-story-step ${story===i?"is-current":""}`} data-scene={i}><div className="v3-story-index"><span>{String(i+1).padStart(2,"0")}</span><i/></div><div className="v3-story-description"><p>{scene.tag}</p><h3>{scene.title}</h3><div>{scene.body}</div><button type="button" onClick={()=>setStory(i)} aria-pressed={story===i}>{story===i?"●":"○"} {t.step} {i+1}</button></div></article>)}
      </div>
      <div className="v3-story-sticky">
       <div className="v3-story-terminal" aria-live="polite" aria-atomic="true">
        <div className="v3-terminal-head"><span><i/> EKMIVO / WORKFLOW</span><span>{String(story+1).padStart(2,"0")} — 06</span></div>
        <div className="v3-terminal-content" key={story}>
         <p className="v3-terminal-kicker">{chapter.tag}</p>
         <h3>{chapter.label}</h3>
         <div className="v3-terminal-signal"><div className="v3-terminal-emblem">{["↗","✳","▦","✓","↗","▤"][story]}</div><div><span>{chapter.signal}</span><strong>{chapter.detail}</strong></div></div>
         <div className="v3-terminal-timeline">{t.journey.map((s,i)=><button key={s.tag} type="button" aria-label={s.title} aria-pressed={story===i} onClick={()=>setStory(i)} className={i<=story?"active":""}><i/><span>{String(i+1).padStart(2,"0")}</span></button>)}</div>
         <p className="v3-terminal-disclaimer">{t.demo}</p>
        </div>
       </div>
       <div className="v3-story-navigation"><button type="button" onClick={()=>setStory(s=>Math.max(0,s-1))} disabled={story===0}>← {t.previous}</button><span>{story+1} / 6</span><button type="button" onClick={()=>setStory(s=>Math.min(5,s+1))} disabled={story===5}>{t.next} →</button></div>
      </div>
     </div>
    </div>
   </section>

   <section className="v3-services v3-section" id="services">
    <div className="v3-wrap">
     <SectionHeading eyebrow={t.servicesTag} title={t.servicesTitle} lead={t.servicesLead}/>
     <div className="v3-service-explorer" data-reveal>
      <div className="v3-service-switcher" role="group" aria-label={t.servicesTitle}>
       {t.serviceOptions.map((label,i)=><button key={label} type="button" id={`v3-service-tab-${i}`} aria-controls="v3-service-panel" aria-pressed={service===i} className={service===i?"active":""} onClick={()=>setService(i)}>{String(i+1).padStart(2,"0")} <span>{label}</span></button>)}
      </div>
      <div className="v3-service-panel" id="v3-service-panel" role="region" aria-labelledby={`v3-service-tab-${service}`}>
       <div className="v3-service-panel-copy"><span>{t.included}</span><h3>{t.serviceOptions[service]}</h3><p>{t.serviceDescriptors[service]}</p><div className="v3-service-tags">{(service===0?t.featuresAI.slice(0,4):service===1?t.featuresCommerce.slice(0,4):[...t.featuresAI.slice(0,2),...t.featuresCommerce.slice(0,2)]).map(f=><span key={f.id}>{f.title}</span>)}</div><div className="v3-service-subnote">✓ {t.independent}</div></div>
       <div className="v3-service-illustration"><div className={`v3-service-orbit choice-${service}`}><div className="v3-service-center"><strong>ekmivo</strong><span>UNIFIED VIEW</span></div><div className="v3-service-node one"><b>✳</b><small>AI</small></div><div className="v3-service-node two"><b>▦</b><small>COMMERCE</small></div><span className="v3-service-beam"/></div></div>
      </div>
     </div>
    </div>
   </section>

   <section className="v3-features v3-section" id="ai">
    <div className="v3-wrap">
     <SectionHeading eyebrow={t.aiTag} title={t.aiTitle} lead={t.aiLead}/>
     <div className="v3-feature-list">
      {t.featuresAI.map(feature=><article className="v3-feature-row" key={feature.id} data-reveal>
       <div className="v3-feature-copy"><span className="v3-feature-number">{feature.tag}</span><h3>{feature.title}</h3><p>{feature.body}</p><ul>{feature.points.map(point=><li key={point}><span>↗</span>{point}</li>)}</ul></div>
       <FeatureVisual kind={feature.id} chips={feature.chips} locale={locale}/>
      </article>)}
     </div>
    </div>
   </section>

   <section className="v3-features v3-commerce-features v3-section" id="commerce">
    <div className="v3-wrap">
     <SectionHeading eyebrow={t.commerceTag} title={t.commerceTitle} lead={t.commerceLead}/>
     <div className="v3-feature-list">
      {t.featuresCommerce.map(feature=><article className="v3-feature-row" key={feature.id} data-reveal>
       <div className="v3-feature-copy"><span className="v3-feature-number">{feature.tag}</span><h3>{feature.title}</h3><p>{feature.body}</p><ul>{feature.points.map(point=><li key={point}><span>↗</span>{point}</li>)}</ul></div>
       <FeatureVisual kind={feature.id} chips={feature.chips} locale={locale}/>
      </article>)}
     </div>
    </div>
   </section>

   <section className="v3-payment v3-section" id="payments">
    <div className="v3-wrap">
     <SectionHeading eyebrow={t.paymentTag} title={t.paymentTitle} lead={t.paymentLead}/>
     <div className="v3-payment-grid" data-reveal>
      <div className="v3-payment-tabs" role="group" aria-label={t.paymentTitle}>{t.scenarios.map((s,i)=><button key={s} type="button" id={`v3-pay-tab-${i}`} aria-pressed={scenario===i} aria-controls="v3-pay-panel"  onClick={()=>setScenario(i)} className={scenario===i?"active":""}><span>0{i+1}</span><strong>{s}</strong><span>↗</span></button>)}
       <div className="v3-pay-explain" id="v3-pay-panel" role="region" aria-labelledby={`v3-pay-tab-${scenario}`}><h3>{t.scenarioTitles[scenario]}</h3><p>{t.scenarioBodies[scenario]}</p></div>
      </div>
      <div className={`v3-payment-interface state-${scenario}`}>
       <div className="v3-pay-head"><span>EKMIVO / PAYMENT MATCH</span><span>{t.demo}</span></div>
       <div className="v3-pay-grid">{t.checks.map((item,i)=><div className={`v3-pay-cell ${scenario===0||scenario===1&&i<2||scenario===2&&i<3?"passed":"unmatched"}`} key={item}><span>{String(i+1).padStart(2,"0")}</span><strong>{item}</strong><b>{scenario===0||scenario===1&&i<2||scenario===2&&i<3?"✓":"—"}</b></div>)}</div>
       <div className="v3-pay-result" role="status"><span>{scenario===0?"✓":scenario===1?"◷":"!"}</span><div><small>{t.status[scenario]}</small><strong>{t.scenarioTitles[scenario]}</strong></div></div>
       <div className="v3-pay-interface-foot"><span>NO CUSTOMER TRXID INPUT</span><span>EK / EVIDENCE FIRST</span></div>
      </div>
     </div>
    </div>
   </section>

   <section className="v3-operations v3-section" id="platform">
    <div className="v3-wrap v3-operations-layout">
     <div><SectionHeading eyebrow={t.operationsTag} title={t.operationsTitle} lead={t.operationsText}/></div>
     <div className="v3-operations-grid">{t.operations.map((item,i)=><article data-reveal key={item}><span>0{i+1}</span><h3>{item}</h3><span className="v3-op-arrow">↗</span></article>)}</div>
    </div>
   </section>

   <section className="v3-solutions v3-section" id="solutions">
    <div className="v3-wrap">
     <SectionHeading eyebrow={t.solutionTag} title={t.solutionTitle}/>
     <div className="v3-solutions-grid" data-reveal>
      <div className="v3-solution-menu" role="group" aria-label={t.solutionTitle}>{t.solutions.map((opt,i)=><button key={opt.name} type="button" id={`v3-solution-tab-${i}`} aria-controls="v3-solution-panel" aria-pressed={solution===i} onClick={()=>setSolution(i)} className={solution===i?"active":""}><span>0{i+1}</span>{opt.name}<b>↗</b></button>)}</div>
      <div className="v3-solution-preview" id="v3-solution-panel" role="region" aria-labelledby={`v3-solution-tab-${solution}`}><span>EKMIVO / SOLUTIONS</span><div className="v3-solution-art"><span>{["▦","◷","⬡","{ }"][solution]}</span><i/><i/></div><div key={solution} className="v3-solution-copy"><h3>{t.solutions[solution].title}</h3><p>{t.solutions[solution].body}</p></div><small>{t.demo}</small></div>
     </div>
    </div>
   </section>

   <section className="v3-trust v3-section" id="principles">
    <div className="v3-wrap"><SectionHeading eyebrow={t.trustTag} title={t.trustTitle}/>
     <div className="v3-trust-grid">{t.trustItems.map((item,i)=><article key={item.title} data-reveal><span className="v3-trust-index">0{i+1} / TRUST</span><div className="v3-trust-glyph">{["◈","⇄","✓","▦"][i]}</div><h3>{item.title}</h3><p>{item.desc}</p></article>)}</div>
    </div>
   </section>

   <section className="v3-pricing v3-section" id="pricing">
    <div className="v3-wrap"><SectionHeading eyebrow={t.pricingTag} title={t.pricingTitle} lead={t.pricingLead}/>
     <div className="v3-pricing-grid">{t.pricing.map((plan,i)=><article key={plan.name} className={i===2?"featured":""} data-reveal><div className="v3-price-top"><span>0{i+1} / EKMIVO</span><span>↗</span></div><h3>{plan.name}</h3><p>{plan.desc}</p><ul>{plan.items.map(item=><li key={item}><span>✓</span>{item}</li>)}</ul><Link href={`/${locale}/register`} className="v3-price-link">{t.pricingAction}<span>↗</span></Link></article>)}</div>
    </div>
   </section>

   <section className="v3-faq v3-section" id="faq"><div className="v3-wrap v3-faq-layout"><div><SectionHeading eyebrow={t.faqTag} title={t.faqTitle}/></div><div className="v3-faq-list">{t.faqs.map(([question,answer],i)=><details key={question}><summary><span>0{i+1}</span><strong>{question}</strong><span className="v3-faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>

   <section className="v3-ending" id="contact"><div className="v3-ending-halo" aria-hidden="true"/><div className="v3-wrap v3-ending-inner"><Eyebrow>{t.finalTag}</Eyebrow><h2>{t.finalTitle}</h2><p>{t.finalText}</p><Link href={`/${locale}/register`} className="v3-btn v3-btn-accent">{t.finalAction}<span>↗</span></Link><small>{t.finalNote}</small></div></section>
  </main>;
}
