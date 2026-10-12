"use client";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {SiteHeader} from "./site-header";
import {SiteFooter} from "./site-footer";
import {MerchantBrand,type MerchantBrandInfo} from "./merchant-brand";
type Field={id:string;label:string;type:string;required:boolean;options:string[]};
type Document={merchant_name:string;brand?:MerchantBrandInfo;kind:string;reference:string;environment:string;amount_minor:number;paid_minor:number;body:{max_quantity?:number;image_url?:string;description?:string;notes?:string;due_at?:string;items?:{title:string;quantity:number;unit_amount_minor:number}[];fields?:Field[]}};
export function PublicDocument({locale,token,standalone=false}:{locale:"en"|"bn";token:string;standalone?:boolean}){
 const router=useRouter();
 const bn=locale==="bn",t=(en:string,bengali:string)=>bn?bengali:en;
 const [doc,setDoc]=useState<Document|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[quantity,setQuantity]=useState(1),[values,setValues]=useState<Record<string,string|string[]>>({});
 const key=useRef<string|null>(null),pendingBody=useRef<string|null>(null),completedToken=useRef<string|null>(null);
 const [unconfirmed,setUnconfirmed]=useState(false);
 const locked=busy||unconfirmed;
 const [terminal,setTerminal]=useState(false);
 function checkoutError(code:string){
  const messages:Record<string,[string,string]>={
   RECEIVING_SOURCE_UNAVAILABLE:["The merchant’s receiving phone is not ready. Contact the merchant; do not send money yet.","বিক্রেতার টাকা গ্রহণকারী ফোন প্রস্তুত নেই। বিক্রেতার সঙ্গে যোগাযোগ করুন; এখন টাকা পাঠাবেন না।"],
   PAYMENT_LINK_EXPIRED:["This payment link has expired. Ask the merchant for a new link.","এই পেমেন্ট লিংকের মেয়াদ শেষ। বিক্রেতার কাছে নতুন লিংক চান।"],
   PAYMENT_LINK_LIMIT_REACHED:["This link has reached its checkout limit. Contact the merchant.","এই লিংকের ব্যবহারসীমা পূর্ণ হয়েছে। বিক্রেতার সঙ্গে যোগাযোগ করুন।"],
   LOCKED_OR_EXPIRED:["This request is no longer available in its current state. Contact the merchant.","এই অবস্থায় পেমেন্ট অনুরোধটি ব্যবহার করা যাচ্ছে না। বিক্রেতার সঙ্গে যোগাযোগ করুন।"],
   BILLING_REQUIRED:["The merchant’s payment service is inactive. Contact the merchant.","বিক্রেতার পেমেন্ট সেবা সক্রিয় নেই। বিক্রেতার সঙ্গে যোগাযোগ করুন।"]
  };return messages[code]?.[bn?1:0]||t("Checkout could not be confirmed. Retry the same request.","Checkout নিশ্চিত হয়নি। একই অনুরোধ আবার চেষ্টা করুন।");
 }
 useEffect(()=>{const abort=new AbortController();fetch(`/api/documents/${token}`,{cache:"no-store",signal:abort.signal}).then(async r=>{if(!r.ok)throw Error(String(r.status));return r.json()}).then(setDoc).catch(e=>{if(!abort.signal.aborted)setError(String(e))}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[token]);
 async function pay(e:React.FormEvent){
  e.preventDefault();if(busy)return;
  if(completedToken.current){router.push(`/${locale}/checkout/${completedToken.current}`);return}
  if(!pendingBody.current&&doc?.body.fields?.some(f=>f.type==="checkbox"&&f.required&&(!Array.isArray(values[f.id])||values[f.id].length===0))){setError(t("Select at least one required option.","প্রয়োজনীয় ঘরে অন্তত একটি বেছে নিন।"));return}
  // Keep one immutable submission while its outcome is unknown. Edits and a new
  // key must never turn a lost successful response into a second checkout.
  pendingBody.current??=JSON.stringify({fields:values,quantity});key.current??=crypto.randomUUID();
  setBusy(true);setError("");setUnconfirmed(true);
  try{
   const r=await fetch(`/api/documents/${token}`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key.current},body:pendingBody.current});
   const d=await r.json();
   if(!r.ok){
    // 408/409/425/429 and 5xx may follow an uncertain or committed attempt.
    if([400,401,403,404,410,413,415,422].includes(r.status)){pendingBody.current=null;key.current=null;setUnconfirmed(false)}
    const code=d.error?.code||d.code||"UNCONFIRMED";
    if(["RECEIVING_SOURCE_UNAVAILABLE","PAYMENT_LINK_EXPIRED","PAYMENT_LINK_LIMIT_REACHED","LOCKED_OR_EXPIRED"].includes(code)){setUnconfirmed(false);pendingBody.current=null;key.current=null}
    if(["PAYMENT_LINK_EXPIRED","PAYMENT_LINK_LIMIT_REACHED","LOCKED_OR_EXPIRED"].includes(code))setTerminal(true);
    throw Error(code);
   }
   if(typeof d.checkout_token!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(d.checkout_token))throw Error("UNCONFIRMED");
   completedToken.current=d.checkout_token;router.push(`/${locale}/checkout/${d.checkout_token}`);
  }catch(e){setError(checkoutError(e instanceof Error?e.message:"UNCONFIRMED"))}
  finally{setBusy(false)}
 }
 async function upload(id:string,file:File){setBusy(true);setError("");try{const r=await fetch(`/api/documents/${token}/files`,{method:"POST",headers:{"X-Filename":encodeURIComponent(file.name),"X-Filename-Encoding":"uri-component"},body:file});const d=await r.json();if(!r.ok)throw Error(d.error?.code||d.code);setValues(v=>({...v,[id]:d.file_id}))}catch{setError(t("Upload unavailable or unconfirmed. Please retry.","আপলোড নিশ্চিত হয়নি বা সেবা পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।"))}finally{setBusy(false)}}
 return <>{!standalone&&<SiteHeader locale={locale} initialTheme="system"/>}<main className={standalone?"pg10-workspace pg05-public-pay":"pg10-workspace"} style={{maxWidth:680,margin:standalone?"32px auto":"120px auto 64px",padding:24}}>{loading?<p role="status">{t("Loading document…","তথ্য লোড হচ্ছে…")}</p>:doc?<article className="ds-panel"><MerchantBrand name={doc.merchant_name} brand={doc.brand} locale={locale}/><h1>{doc.reference}</h1>{doc.environment==="sandbox"&&<p>{t("Sandbox — no real money","পরীক্ষামূলক — আসল টাকা নয়")}</p>}<p>{doc.body.description}</p>{doc.body.image_url&&<Image unoptimized src={doc.body.image_url} alt={doc.body.description||t("Product image","পণ্যের ছবি")} width={720} height={480} referrerPolicy="no-referrer" style={{maxWidth:"100%",height:"auto",objectFit:"contain"}}/>}{doc.kind!=="payment-links"&&doc.body.items&&<table><thead><tr><th>{t("Description","বিবরণ")}</th><th>{t("Quantity","পরিমাণ")}</th><th>{t("Amount","টাকা")}</th></tr></thead><tbody>{doc.body.items.map((item,i)=><tr key={i}><td>{item.title}</td><td>{item.quantity}</td><td>{(item.quantity*item.unit_amount_minor/100).toLocaleString(locale)} BDT</td></tr>)}</tbody></table>}<dl><dt>{t("Total","মোট")}</dt><dd>{doc.amount_minor/100} BDT</dd>{doc.kind!=="payment-links"&&<><dt>{t("Verified paid","যাচাইকৃত পরিশোধ")}</dt><dd>{doc.paid_minor/100} BDT</dd><dt>{t("Due","বাকি")}</dt><dd>{Math.max(0,doc.amount_minor-doc.paid_minor)/100} BDT</dd></>}</dl><p>{doc.body.notes}</p>{doc.body.due_at&&<p>{t("Due date","পরিশোধের শেষ সময়")}: {new Date(doc.body.due_at).toLocaleString(locale)}</p>}<form className="pg10-form" onSubmit={pay}>{doc.kind==="payment-links"&&(doc.body.max_quantity??1)>1&&<label>{t("Quantity","পরিমাণ")}<input type="number" min={1} max={doc.body.max_quantity} required disabled={locked} value={quantity} onChange={e=>{setQuantity(Number(e.target.value));key.current=null}}/></label>}{doc.body.fields?.map(f=><div key={f.id} className="pg10-custom-field">{f.type==="checkbox"||f.type==="radio"?<fieldset disabled={locked}><legend>{f.label}{f.required?" *":""}</legend>{f.options.map(option=><label key={option}><input type={f.type} name={`field-${f.id}`} required={f.type==="radio"&&f.required} checked={f.type==="radio"?values[f.id]===option:Array.isArray(values[f.id])&&values[f.id].includes(option)} onChange={e=>setValues(v=>{if(f.type==="radio")return {...v,[f.id]:option};const list=Array.isArray(v[f.id])?v[f.id] as string[]:[];return {...v,[f.id]:e.target.checked?[...list,option]:list.filter(x=>x!==option)}})}/>{option}</label>)}</fieldset>:<><label htmlFor={`field-${f.id}`}>{f.label}{f.required?" *":""}</label>{f.type==="file"?<><input id={`field-${f.id}`} type="file" required={f.required&&!values[f.id]} accept="image/jpeg,image/png,application/pdf" disabled={locked} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(f.id,file)}}/>{values[f.id]&&<span>{t("Uploaded and scanned","আপলোড ও স্ক্যান হয়েছে")}</span>}</>:f.type==="select"?<select id={`field-${f.id}`} required={f.required} value={String(values[f.id]||"")} disabled={locked} onChange={e=>setValues(v=>({...v,[f.id]:e.target.value}))}><option value="">{t("Choose","বেছে নিন")}</option>{f.options.map(option=><option key={option}>{option}</option>)}</select>:f.type==="textarea"?<textarea id={`field-${f.id}`} required={f.required} disabled={locked} maxLength={2000} value={String(values[f.id]||"")} onChange={e=>setValues(v=>({...v,[f.id]:e.target.value}))}/>:<input id={`field-${f.id}`} required={f.required} disabled={locked} maxLength={2000} value={String(values[f.id]||"")} onChange={e=>setValues(v=>({...v,[f.id]:e.target.value}))}/>}</>}</div>)}<button disabled={busy||terminal||(doc.kind==="invoices"&&doc.paid_minor>=doc.amount_minor)}>{busy?t("Creating checkout…","Checkout তৈরি হচ্ছে…"):unconfirmed?t("Retry same checkout","একই checkout আবার চেষ্টা করুন"):t(`Pay ${doc.amount_minor*quantity/100} BDT`,`${doc.amount_minor*quantity/100} টাকা পরিশোধ করুন`)}</button></form>{!standalone&&<button onClick={()=>window.print()}>{t("Print / save PDF","Print / PDF সংরক্ষণ")}</button>}</article>:null}{error&&<p role="alert">{error}</p>}</main>{!standalone&&<SiteFooter locale={locale}/>}</>;
}
