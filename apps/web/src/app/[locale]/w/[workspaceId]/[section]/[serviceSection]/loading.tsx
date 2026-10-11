"use client";
import { usePathname } from "next/navigation";
export default function WorkspaceLoading(){
 const bn=usePathname().startsWith("/bn/");
 return <main className="ds-route-loading" role="status" aria-live="polite" aria-busy="true">
  <div className="ds-loading-brand"><strong>ekmivo<span>.</span></strong><span>{bn?"ওয়ার্কস্পেস লোড হচ্ছে":"Loading workspace"}</span></div>
  <div className="ds-loading-skeleton" aria-hidden="true"><span/><span/><span/><span/></div>
  <p>{bn?"ব্যবসা, অনুমতি এবং পেমেন্ট পরিবেশ যাচাই করা হচ্ছে…":"Checking business membership, permissions and payment environment…"}</p>
 </main>;
}
