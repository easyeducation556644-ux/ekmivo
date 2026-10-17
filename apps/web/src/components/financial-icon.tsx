import type {SVGProps} from "react";
const paths:Record<string,string>={
 refresh:"M20 12a8 8 0 1 1-2.5-5.8M20 4v4h-4",
 download:"M12 4v11M7 11l5 5 5-5M5 20h14",
 printer:"M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2",
 list:"M5 4h14M5 12h14M5 20h14",
 "alert-circle":"M12 8v5M12 16.5v.01",
 sliders:"M4 7h10M18 7h2M4 17h2M10 17h10",
 search:"m16 16 4.5 4.5",
 "chevron-right":"m9 6 6 6-6 6",
 x:"M6 6l12 12M18 6 6 18",
 copy:"M5 15V6a2 2 0 0 1 2-2h8"
};
export function FinancialIcon({name,...props}:SVGProps<SVGSVGElement>&{name:string}){
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
 {name==="search"&&<circle cx="11" cy="11" r="6.5"/>}
 {name==="alert-circle"&&<circle cx="12" cy="12" r="9"/>}
 {name==="sliders"&&<><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>}
 {name==="printer"&&<rect x="7" y="14" width="10" height="6" rx="1"/>}
 {name==="copy"&&<rect x="9" y="9" width="11" height="11" rx="2"/>}
 <path d={paths[name]??paths.list}/>
 </svg>
}
