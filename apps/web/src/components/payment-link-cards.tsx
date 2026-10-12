"use client";
import Link from "next/link";

export type PaymentLinkRow={id:string;reference:string;status:string;version:number;amount_minor:number;paid_minor:number;public_token?:string;body:{description?:string;expires_at?:string;max_uses?:number}};
export function LinkIcon({type="link"}:{type?:"link"|"plus"|"copy"|"open"}){
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{type==="plus"?<path d="M12 5v14M5 12h14"/>:type==="copy"?<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>:type==="open"?<><path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6"/></>:<><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/></>}</svg>;
}
export function paymentLinkState(row:PaymentLinkRow,now:number){return row.status==="active"&&row.body.expires_at&&Date.parse(row.body.expires_at)<=now?"expired":row.status}
export function PaymentLinkCards({rows,now,locale,workspaceId,environment,busy,canWrite,onEdit,onPublish,onArchive,onCopy}:{rows:PaymentLinkRow[];now:number;locale:"en"|"bn";workspaceId:string;environment:string;busy:boolean;canWrite:boolean;onEdit:(row:PaymentLinkRow)=>void;onPublish:(row:PaymentLinkRow)=>void;onArchive:(row:PaymentLinkRow)=>void;onCopy:(url:string)=>void}){
 const t=(en:string,bn:string)=>locale==="bn"?bn:en;
 const labels:Record<string,string>={active:t("Active","সক্রিয়"),expired:t("Expired","মেয়াদ শেষ"),archived:t("Archived","আর্কাইভ"),draft:t("Draft","খসড়া")};
 const money=(v:number)=>new Intl.NumberFormat(locale==="bn"?"bn-BD":"en-BD",{style:"currency",currency:"BDT"}).format(v/100);
 return <div className="pl-cards">{rows.map(row=>{const state=paymentLinkState(row,now),publicPath=row.public_token?`/${locale}/pay/${row.public_token}`:null;return <article className="pl-card" key={row.id}>
  <div className="pl-card-heading"><span className="pl-link-icon"><LinkIcon/></span><div><Link className="pl-title" href={`/${locale}/w/${workspaceId}/payments/payment-links/${row.id}?env=${environment}`}>{row.reference}</Link><p>{row.body.description||t("Payment link","পেমেন্ট লিংক")}</p></div><span className="pl-status" data-state={state}>{labels[state]||t("Unavailable","উপলব্ধ নয়")}</span></div>
  <dl className="pl-facts"><div><dt>{t("Amount per checkout","প্রতি checkout-এর পরিমাণ")}</dt><dd>{money(row.amount_minor)}</dd></div><div><dt>{t("Verified received","যাচাইকৃত প্রাপ্তি")}</dt><dd>{money(row.paid_minor)}</dd></div><div><dt>{t("Expires","মেয়াদ")}</dt><dd>{row.body.expires_at?new Date(row.body.expires_at).toLocaleDateString(locale==="bn"?"bn-BD":"en-BD") :t("No expiry","মেয়াদ নেই")}</dd></div></dl>
  <div className="pl-card-actions">{publicPath&&state==="active"&&<><button disabled={busy} type="button" onClick={()=>onCopy(publicPath)}><LinkIcon type="copy"/>{t("Copy link","লিংক কপি")}</button><Link href={publicPath} target="_blank" rel="noopener noreferrer"><LinkIcon type="open"/>{t("Preview","দেখুন")}</Link></>}{canWrite&&state!=="archived"&&<><button disabled={busy} onClick={()=>onEdit(row)}>{t("Edit","পরিবর্তন")}</button><button disabled={busy} onClick={()=>onPublish(row)}>{state==="draft"?t("Publish","প্রকাশ করুন"):t("Publish changes","পরিবর্তন প্রকাশ")}</button><button disabled={busy} className="pl-archive" onClick={()=>onArchive(row)}>{t("Archive","আর্কাইভ")}</button></>}</div>
 </article>})}</div>;
}
