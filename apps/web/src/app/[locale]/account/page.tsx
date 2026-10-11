import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser,hashToken } from "../../../lib/server/auth";
import { database } from "../../../lib/server/db";
import { AccountActions } from "../../../components/account-actions";
import { SiteControls } from "../../../components/site-controls";
import { logoutAction } from "../../../actions/account";

export const dynamic="force-dynamic";
export default async function AccountPage({params}:{params:Promise<{locale:string}>}){
 const {locale:raw}=await params,locale=raw==="en"?"en":"bn",bn=locale==="bn";
 const user=await requireUser(locale);
 const cookieJar=await cookies();
 const token=cookieJar.get("ekmivo-session")?.value;
 const currentHash=token?hashToken(token):"";
 const [sessions,mfa]=await Promise.all([
  database()`SELECT created_at,expires_at,(token_hash=${currentHash}) AS is_current
  FROM auth_sessions WHERE user_id=${user.id}::uuid AND revoked_at IS NULL
   AND expires_at>now() ORDER BY created_at DESC LIMIT 25`,
  database()`SELECT confirmed_at IS NOT NULL AS enabled
   FROM platform_admin_mfa WHERE user_id=${user.id}::uuid LIMIT 1`
 ]);
 const format=(value:unknown)=>new Intl.DateTimeFormat(bn?"bn-BD":"en-BD",
  {dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Dhaka"}).format(new Date(String(value)));
 const themeValue=cookieJar.get("ekmivo-theme")?.value;
 const theme=themeValue==="light"||themeValue==="dark"?themeValue:"system";
 return <main className="ek-app-shell ek-account-page">
  <header className="ek-app-topbar"><Link href={`/${locale}/workspaces`} className="ek-wordmark">ekmivo.</Link>
   <SiteControls locale={locale} initialTheme={theme}/></header>
  <div className="ek-page-wrap">
   <p className="ek-page-kicker">EKMIVO / ACCOUNT SECURITY</p>
   <h1>{bn?"অ্যাকাউন্ট ও নিরাপত্তা":"Account & security"}</h1>
   <p className="ek-lead">{bn?"প্রোফাইল, লগইন ও নিরাপত্তার প্রকৃত তথ্য এখানে।":"Real profile, authentication and session records."}</p>
   <section className="ek-account-panel">
    <h2>{bn?"অ্যাকাউন্টের বিবরণ":"Account details"}</h2>
    <dl>
     <dt>{bn?"ইমেইল":"Email"}</dt><dd>{user.email}</dd>
     <dt>{bn?"ইমেইল যাচাই":"Email verification"}</dt><dd>{user.verified?(bn?"যাচাইকৃত":"Verified"):(bn?"যাচাই হয়নি":"Not verified")}</dd>
     <dt>{bn?"অ্যাডমিন MFA":"Administrator MFA"}</dt><dd>{mfa[0]?.enabled?(bn?"সক্রিয়":"Enabled"):(bn?"চালু নয় / প্রযোজ্য নয়":"Not enrolled / not applicable")}</dd>
    </dl>
   </section>
   <AccountActions locale={locale} name={user.name}/>
   <section className="ek-account-panel">
    <h2>{bn?"সক্রিয় সেশন":"Active sessions"}</h2>
    {sessions.length?<ul className="ek-account-sessions">{sessions.map((s,i)=><li key={i}>
     <strong>{s.is_current?(bn?"এই সেশন":"This session"):(bn?"অন্য সেশন":"Other session")}</strong>
     <span>{bn?"শুরু":"Started"}: {format(s.created_at)} · {bn?"মেয়াদ":"Expires"}: {format(s.expires_at)}</span>
    </li>)}</ul>:<p>{bn?"সক্রিয় সেশন পাওয়া যায়নি।":"No active sessions found."}</p>}
    <small>{bn?"ডিভাইস/IP তথ্য সংগ্রহ করা হয়নি—তাই অনুমান করে দেখাচ্ছি না।":"Device and IP details are not collected or fabricated."}</small>
   </section>
   <nav className="ek-account-footer">
    <Link href={`/${locale}/forgot-password`}>{bn?"পাসওয়ার্ড পুনরুদ্ধার":"Password recovery"}</Link>
    <Link href={`/${locale}/workspaces`}>{bn?"ওয়ার্কস্পেসে ফিরুন":"Back to workspaces"}</Link>
    <form action={logoutAction.bind(null,locale)}><button type="submit">{bn?"লগ আউট":"Sign out"}</button></form>
   </nav>
  </div>
 </main>;
}
