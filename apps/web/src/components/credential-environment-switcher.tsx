"use client";
import {useState} from "react";
import {ApiKeyManager,type ApiKeyRow} from "./api-key-manager";
import {AutomaticWebhookSecret} from "./automatic-webhook-secret";
import type {Locale,PaymentEnvironment} from "../lib/dashboard-navigation";

type RealmKeys={live:ApiKeyRow[];sandbox:ApiKeyRow[]};
export function CredentialEnvironmentSwitcher({locale,userId,workspaceId,initialEnvironment,enabled,keys}:{locale:Locale;userId:string;workspaceId:string;initialEnvironment:PaymentEnvironment;enabled:PaymentEnvironment[];keys:RealmKeys}){
 const [realm,setRealm]=useState<PaymentEnvironment>(enabled.includes(initialEnvironment)?initialEnvironment:enabled[0]??initialEnvironment);
 const available=enabled.includes(realm);
 return <div className="ref-credentials-environments">
  <div className="seg" role="group" aria-label={locale==="bn"?"API key পরিবেশ":"API key environment"} style={{display:"inline-flex",margin:"0 0 16px"}}>
   {(["sandbox","live"] as const).map(environment=><button key={environment} type="button" className={realm===environment?"on":""} aria-pressed={realm===environment} onClick={()=>setRealm(environment)}>{environment==="sandbox"?"Sandbox":"Live"}</button>)}
  </div>
  {available&&realm==="sandbox"&&<p className="notice" role="status">{locale==="bn"?"Sandbox key দিয়ে শুধু পরীক্ষামূলক ডেটা ব্যবহার করা যায়। এখানে আসল টাকা লেনদেন হয় না।":"Sandbox keys use test data. No real money is involved."}</p>}
  {!available?<div className="notice ref-errors" role="status">{locale==="bn"?`${realm==="sandbox"?"Sandbox":"Live"} পরিবেশটি এই workspace-এ সক্রিয় নেই। এটি চালু হলে এখানে API key তৈরি করা যাবে।`:`${realm==="sandbox"?"Sandbox":"Live"} environment is not active for this workspace. Enable it before issuing keys.`}</div>:<>
   <ApiKeyManager key={userId+":"+workspaceId+":"+realm} locale={locale} userId={userId} workspaceId={workspaceId} environment={realm} keys={keys[realm]}/>
   <AutomaticWebhookSecret key={realm} workspaceId={workspaceId} environment={realm} locale={locale}/>
  </>}
 </div>;
}
