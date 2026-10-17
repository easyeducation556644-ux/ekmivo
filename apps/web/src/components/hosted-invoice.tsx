"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from "react";
import Link from "next/link";
import {parseCheckoutTheme} from "../lib/checkout-theme";
import "./hosted-invoice.css";
type Item={title:string;quantity:number;unit_amount_minor:number};
type Invoice={kind:string;reference:string;merchant_name?:string;brand?:{logo_url?:string;title?:string;checkout_theme?:string};amount_minor:number;paid_minor:number;due_minor?:number;environment?:string;created_at?:string;body?:{items?:Item[];due_at?:string;issued_at?:string;name?:string;email?:string;description?:string;notes?:string;tax_minor?:number;fee_minor?:number;shipping_minor?:number;discount_minor?:number}};
export function HostedInvoice({locale,token}:{locale:"en"|"bn";token:string}){
 const bn=locale==="bn",t=(en:string,be:string)=>bn?be:en;
 const [doc,setDoc]=useState<Invoice|null>(null),[pending,setPending]=useState(true),[error,setError]=useState("");
 useEffect(()=>{const abort=new AbortController();setPending(true);fetch("/api/documents/"+token,{cache:"no-store",signal:abort.signal}).then(async r=>{if(!r.ok)throw Error("UNAVAILABLE");return r.json()}).then(d=>{if(!abort.signal.aborted){if(d?.kind!=="invoices")throw Error("INVALID_KIND");setDoc(d)}}).catch(()=>{if(!abort.signal.aborted)setError(t("Invoice unavailable or no longer payable.","ইনভয়েস পাওয়া যাচ্ছে না বা আর পরিশোধযোগ্য নয়।"))}).finally(()=>{if(!abort.signal.aborted)setPending(false)});return()=>abort.abort()},[token,locale]);
 const money=(n:number)=>new Intl.NumberFormat(bn?"bn-BD":"en-BD",{style:"currency",currency:"BDT",minimumFractionDigits:2}).format(n/100);
 const fmt=(raw?:string)=>{if(!raw)return "—";const d=new Date(raw);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(bn?"bn-BD":"en-GB",{dateStyle:"medium",timeZone:"Asia/Dhaka"}).format(d):"—"};
 const rows=doc?.body?.items??[];const subtotal=rows.reduce((sum,item)=>sum+item.quantity*item.unit_amount_minor,0);
 const total=doc?.amount_minor??0,paid=doc?.paid_minor??0;
 const fullyPaid=Boolean(doc)&&total>0&&paid>=total;const overdue=Boolean(doc?.body?.due_at)&&new Date(doc!.body!.due_at!).getTime()<Date.now();
 const status=fullyPaid?t("Paid","পরিশোধিত"):overdue?t("Overdue","মেয়াদ পেরিয়েছে"):t("Due","বাকি");
 const theme=parseCheckoutTheme(doc?.brand?.checkout_theme);const logo=theme?.store.logo||doc?.brand?.logo_url;const safeLogo=logo&&(logo.startsWith("/")&&!logo.startsWith("//")||/^https:\/\/[^\s@]+$/i.test(logo))?logo:undefined;
 return <main className="ek-invoice-host" lang={locale}>
  <div className="ek-invoice-actions"><Link href="/" aria-label={t("Ekmivo home","Ekmivo হোম")}>ekmivo</Link><div><Link href={`/${bn?"en":"bn"}/invoice/${token}`}>{bn?"English":"বাংলা"}</Link><button type="button" onClick={()=>window.print()} disabled={!doc}>{t("Print / Save PDF","প্রিন্ট / PDF সেভ")}</button></div></div>
  {pending?<p role="status">{t("Loading invoice…","ইনভয়েস লোড হচ্ছে…")}</p>:error?<p role="alert">{error}</p>:doc&&<article className="ek-invoice-sheet">
   <header className="ek-invoice-heading"><div className="ek-invoice-business">{safeLogo&&<img src={safeLogo} width={54} height={54} alt="" referrerPolicy="no-referrer"/>}<div><strong>{doc.merchant_name||doc.brand?.title||"Ekmivo"}</strong><span>{t("Invoice","ইনভয়েস")}</span></div></div><div className="ek-invoice-meta"><h1>{t("Invoice","ইনভয়েস")} <span>{doc.reference}</span></h1><span className={fullyPaid?"ek-invoice-status paid":"ek-invoice-status"}>{status}</span></div></header>
   {doc.environment==="sandbox"&&<p className="ek-invoice-sandbox">{t("Sandbox invoice — no real money","স্যান্ডবক্স ইনভয়েস — আসল টাকা নয়")}</p>}
   <section className="ek-invoice-details"><div><small>{t("Issued","ইস্যু")}</small><strong>{fmt(doc.body?.issued_at||doc.created_at)}</strong></div><div><small>{t("Due date","শেষ তারিখ")}</small><strong>{fmt(doc.body?.due_at)}</strong></div><div><small>{t("To","প্রাপক")}</small><strong>{doc.body?.name||"—"}</strong>{doc.body?.email&&<span>{doc.body.email}</span>}</div></section>
   {doc.body?.description&&<p className="ek-invoice-description">{doc.body.description}</p>}
   <div className="ek-invoice-overflow"><table><thead><tr><th>{t("Description","বিবরণ")}</th><th>{t("Quantity","পরিমাণ")}</th><th>{t("Unit price","একক দাম")}</th><th>{t("Line total","মোট")}</th></tr></thead><tbody>{rows.map((item,i)=><tr key={i}><td>{item.title}</td><td>{item.quantity}</td><td>{money(item.unit_amount_minor)}</td><td>{money(item.quantity*item.unit_amount_minor)}</td></tr>)}</tbody></table></div>
   <div className="ek-invoice-totals"><div><span>{t("Subtotal","উপমোট")}</span><strong>{money(subtotal)}</strong></div>{([["Tax","কর",doc.body?.tax_minor],["Invoice fee","ইনভয়েস ফি",doc.body?.fee_minor],["Shipping","ডেলিভারি",doc.body?.shipping_minor],["Discount","ছাড়",-(doc.body?.discount_minor??0)]] as const).filter(item=>item[2]).map(([en,be,value])=><div key={en}><span>{t(en,be)}</span><strong>{money(value??0)}</strong></div>)}<div className="ek-invoice-total"><span>{t("Total","সর্বমোট")}</span><strong>{money(total)}</strong></div>{paid>0&&<div><span>{t("Paid","পরিশোধিত")}</span><strong>{money(paid)}</strong></div>}{paid<total&&<div><span>{t("Outstanding","বাকি")}</span><strong>{money(Math.max(0,doc.due_minor??total-paid))}</strong></div>}</div>
   {doc.body?.notes&&<p className="ek-invoice-description">{doc.body.notes}</p>}
   <footer className="ek-invoice-foot">{fullyPaid?<p className="ek-invoice-paid" role="status">{t("Payment verified. Thank you.","পেমেন্ট যাচাই হয়েছে। ধন্যবাদ।")}</p>:<Link className="ek-invoice-pay" href={`/${locale}/pay/${token}`}>{t("Pay invoice","ইনভয়েস পরিশোধ করুন")}</Link>}<small>{t("Payments are confirmed only after server verification.","শুধু সার্ভার যাচাইয়ের পর পেমেন্ট নিশ্চিত হয়।")}</small></footer>
  </article>}
 </main>;
}
