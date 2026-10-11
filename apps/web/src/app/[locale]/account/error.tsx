"use client";
import { usePathname } from "next/navigation";
export default function AccountError({reset}:{error:Error & {digest?:string};reset:()=>void}){
 const bn=usePathname().startsWith("/bn/");
 return <main role="alert" className="ds-route-error">
  <p className="ek-page-kicker">EKMIVO / ACCOUNT</p>
  <h1>{bn?"অ্যাকাউন্ট লোড করা যায়নি":"Unable to load account"}</h1>
  <p>{bn?"অনুরোধ ব্যর্থ হয়েছে। কোনো তথ্য পরিবর্তন হয়নি।":"The request failed. No data was changed."}</p>
  <button type="button" className="ds-route-retry" onClick={()=>reset()}>{bn?"আবার চেষ্টা":"Retry"}</button>
 </main>;
}
