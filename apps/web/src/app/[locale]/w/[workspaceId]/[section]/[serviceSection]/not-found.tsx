"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
export default function WorkspaceUnavailable(){
 const pathname=usePathname(),bn=pathname.startsWith("/bn/"),locale=bn?"bn":"en";
 return <main className="ds-route-error">
  <span className="ds-error-eyebrow">EKMIVO / ACCESS</span>
  <h1>{bn?"এই পৃষ্ঠা বা পরিবেশে প্রবেশের অনুমতি নেই":"This page or environment is unavailable"}</h1>
  <p>{bn?"ব্যবসা, সেবা অথবা Sandbox/Live অনুমতি পাওয়া যায়নি। অন্য ব্যবসার তথ্য দেখানো হচ্ছে না।":"The business, product or Sandbox/Live permission could not be validated. No other business's data is shown."}</p>
  <Link className="ds-route-retry" href={`/${locale}/workspaces`}>{bn?"নিজের ব্যবসাগুলো দেখুন":"Open your businesses"} ↗</Link>
 </main>;
}
