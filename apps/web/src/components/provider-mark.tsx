import type {SVGProps} from "react";

export type PayMethod="bkash"|"nagad"|"rocket";
export const payNames:Record<PayMethod,string>={bkash:"bKash",nagad:"Nagad",rocket:"Rocket"};
export const payMethods:PayMethod[]=["bkash","nagad","rocket"];
export function isPayMethod(value:string):value is PayMethod{return payMethods.some(method=>method===value)}

/** Reusable merchant-provided provider logos, stored as local PNG assets. */
export function ProviderMark({method,bn=false,...props}:{method:PayMethod;bn?:boolean}&Omit<SVGProps<SVGSVGElement>,"children">){
 return <svg viewBox="0 0 240 120" role="img" aria-label={method==="bkash"?(bn?"বিকাশ":"bKash"):payNames[method]} {...props}>
   <image href={`/payment-assets/${method}.png`} x="0" y="0" width="240" height="120" preserveAspectRatio="xMidYMid meet"/>
  </svg>;
}
