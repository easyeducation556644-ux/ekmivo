"use client";
import {useEffect,useRef} from "react";
export function PublicMotion({children}:{children:React.ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches||!window.IntersectionObserver)return;
  const observer=new IntersectionObserver(entries=>{for(const item of entries)if(item.isIntersecting){(item.target as HTMLElement).dataset.entered="true";observer.unobserve(item.target);}},{threshold:.12});
  ref.current?.querySelectorAll(".ek-pg-mast-grid > *, .ek-public-section > .ek-public-wrap, .ek-pg-finish").forEach(el=>observer.observe(el));
  return()=>observer.disconnect();
 },[]);
 return <div ref={ref} className="ek-public-motion">{children}</div>;
}
