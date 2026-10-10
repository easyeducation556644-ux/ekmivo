import Link from "next/link";
import { siteCopy, type Locale } from "../lib/site-copy";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = siteCopy[locale];
  return <footer className="site-footer"><div className="footer-inner">
    <div className="footer-main"><Link className="footer-brand" href={`/${locale}`}>ekmivo<span>.</span></Link><p>{t.footerLine}</p></div>
    <nav aria-label={locale === "bn" ? "ফুটার নেভিগেশন" : "Footer navigation"}><Link href={`/${locale}#services`}>{t.nav.services}</Link><Link href={`/${locale}#workflow`}>{t.nav.workflow}</Link><Link href={`/${locale}/login`}>{t.login}</Link><Link href={`/${locale}/register`}>{t.register}</Link></nav>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Ekmivo. {t.rights}</span><span className="footer-status"><i aria-hidden="true" />{t.footerStatus}</span></div>
  </div></footer>;
}
