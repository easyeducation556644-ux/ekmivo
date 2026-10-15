"use client";
import {useEffect,useState} from "react";
export function AutomaticWebhookSecret({workspaceId,environment,locale}:{workspaceId:string;environment:string;locale:"en"|"bn"}){
 const bn=locale==="bn",[secret,setSecret]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{if(!secret)return;const timer=setTimeout(()=>setSecret(""),60000);return()=>clearTimeout(timer)},[secret]);
 async function reveal(){setBusy(true);setError("");try{
  const r=await fetch(`/api/go/workspaces/${workspaceId}/automatic-webhook-secret?environment=${environment}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});
  if(!r.ok)throw Error(String(r.status));const data=await r.json();if(typeof data.signing_secret!=="string")throw Error("INVALID_RESPONSE");setSecret(data.signing_secret);
 }catch{setError(bn?"Signing secret পাওয়া যায়নি। আবার চেষ্টা করুন।":"Unable to reveal signing secret. Please retry.")}finally{setBusy(false)}}
 return <section className="ws-card ref-signing-secret"><h2>{bn?"Automatic webhook signing":"Automatic webhook signing"}</h2><p>{bn?"Create Payment-এ webhook_url দিলেই callback পাবেন। এই secret শুধু নিজের backend-এ রাখুন; পরিবেশ অনুযায়ী আলাদা।":"Supply webhook_url when creating a payment. Use this environment’s signing secret on your backend to authenticate automatic callbacks."}</p>{error&&<p role="alert">{error}</p>}{secret?<><code>{secret}</code><button type="button" onClick={()=>setSecret("")}>{bn?"লুকান":"Hide secret"}</button><small>{bn?"এক মিনিট পরে নিজে থেকে লুকাবে।":"Automatically hidden after one minute."}</small></>:<button type="button" onClick={()=>void reveal()} disabled={busy}>{busy?(bn?"খুলছে…":"Revealing…"):(bn?"Signing secret দেখুন":"Reveal signing secret")}</button>}</section>;
}
