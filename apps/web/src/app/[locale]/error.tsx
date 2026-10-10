"use client";
import { useEffect } from "react";
export default function AppError({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("An application route failed",error.digest??"server_error");},[error]);
 return <main className="ek-app-shell ek-error-page"><div className="ek-error-box">
 <span>EKMIVO / ERROR</span>
 <h1>Something went wrong.</h1><p>The server could not complete this request. Please retry. If the problem continues, contact support with the reference below.</p>
 {error.digest&&<small>Reference: {error.digest}</small>}
 <button type="button" className="ek-action" onClick={reset}>Try again ↗</button>
 </div><div role="alert" className="ek-toast"><strong>Server error</strong><p>Your request could not be completed.</p></div></main>;
}
