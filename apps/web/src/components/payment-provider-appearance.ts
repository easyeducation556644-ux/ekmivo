import type {CSSProperties} from "react";

/** A single, authoritative palette shared by account cards and provider-picker tiles. */
export const paymentProviderAppearance={
 bkash:{
  name:"bKash",logo:"/payment-assets/bkash.png",rgb:"226,19,110",
  lightBackground:"linear-gradient(135deg,#fff1f7 0%,#ffc4dc 100%)",
  lightForeground:"#3b0a22",lightBorder:"rgba(226,19,110,0.16)",lightOrb:"rgba(226,19,110,0.16)"
 },
 nagad:{
  name:"Nagad",logo:"/payment-assets/nagad.png",rgb:"240,120,30",
  lightBackground:"linear-gradient(135deg,#fff6e8 0%,#ffd2a8 100%)",
  lightForeground:"#3a1405",lightBorder:"rgba(237,100,36,0.18)",lightOrb:"rgba(237,28,36,0.13)"
 },
 rocket:{
  name:"Rocket",logo:"/payment-assets/rocket.png",rgb:"170,70,190",
  lightBackground:"linear-gradient(135deg,#f8efff 0%,#d8bdee 100%)",
  lightForeground:"#2a0f33",lightBorder:"rgba(140,52,148,0.18)",lightOrb:"rgba(140,52,148,0.17)"
 }
} as const;
export type PaymentProvider=keyof typeof paymentProviderAppearance;
export const paymentProviderKeys=Object.keys(paymentProviderAppearance) as PaymentProvider[];
export function isPaymentProvider(method:string):method is PaymentProvider{return method in paymentProviderAppearance}
export type ProviderSurfaceStyle=CSSProperties&{
 "--provider-bg-light":string;
 "--provider-fg-light":string;
 "--provider-border-light":string;
 "--provider-orb-light":string;
 "--provider-glow-rgb":string;
};
export function providerSurfaceStyle(method:string):ProviderSurfaceStyle{
 const config=isPaymentProvider(method)?paymentProviderAppearance[method]:undefined;
 return {
  "--provider-bg-light":config?.lightBackground??"linear-gradient(135deg,#f4f4f8 0%,#d9d9e4 100%)",
  "--provider-fg-light":config?.lightForeground??"#1c1c26",
  "--provider-border-light":config?.lightBorder??"rgba(80,80,120,0.16)",
  "--provider-orb-light":config?.lightOrb??"rgba(80,80,120,0.12)",
  "--provider-glow-rgb":config?.rgb??"120,120,160"
 };
}
