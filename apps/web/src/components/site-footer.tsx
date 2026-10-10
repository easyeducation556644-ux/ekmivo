import Link from "next/link";
import { siteCopy, type Locale } from "../lib/site-copy";

export function SiteFooter({ locale }: { locale: Locale }) {
 const t=siteCopy[locale];
 return <footer className="site-footer"><div className="footer-inner">
   <div className="footer-main"><Link className="footer-brand" href={`/${locale}`}>ekmivo<span>.</span></Link><p>{t.footerLine}</p></div>
   <nav aria-label={locale === "bn" ? "ফুটার নেভিগেশন" : "Footer navigation"}>
    <Link href={`/${locale}#ai`}>{t.nav.ai}</Link>
    <Link href={`/${locale}#commerce`}>{t.nav.commerce}</Link>
    <Link href={`/${locale}#payments`}>{locale==="bn"?"পেমেন্ট": "Payments"}</Link>
    <Link href={`/${locale}#solutions`}>{t.nav.solutions}</Link>
    <Link href={`/${locale}#pricing`}>{t.nav.pricing}</Link>
    <Link href={`/${locale}#faq`}>{t.nav.faq}</Link>
    <Link href={`/${locale}/login`}>{t.login}</Link>
    <Link href={`/${locale}/register`}>{t.register}</Link>
   </nav>
   <div className="footer-bottom"><span>© {new Date().getFullYear()} Ekmivo. {t.rights}</span><span className="footer-status"><i aria-hidden="true" />{t.footerStatus}</span></div>
 </div></footer>;
}
