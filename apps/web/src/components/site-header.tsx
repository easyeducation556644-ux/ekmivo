"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteControls } from "./site-controls";
import { siteCopy, type Locale } from "../lib/site-copy";

type Theme = "system" | "light" | "dark";

export function SiteHeader({ locale, initialTheme }: { locale: Locale; initialTheme: Theme }) {
  const t = siteCopy[locale];
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      setScrolled(y > 36);
      if (y < 72 || menuOpen) setHidden(false);
      else if (delta > 6 && y > 168) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return <header inert={hidden} className={`site-header${scrolled ? " is-wide" : ""}${hidden ? " is-hidden" : ""}${menuOpen ? " menu-open" : ""}`}>
    <div className="header-inner">
      <Link className="brand" href={`/${locale}`} aria-label="Ekmivo home" onClick={() => setMenuOpen(false)}><span className="brand-mark" aria-hidden="true"><span /></span><span>ekmivo<span className="brand-dot">.</span></span></Link>
      <nav className={`header-nav${menuOpen ? " open" : ""}`} aria-label={locale === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}>
        <Link href={`/${locale}#services`} onClick={() => setMenuOpen(false)}>{t.nav.services}</Link>
        <Link href={`/${locale}#ai`} onClick={() => setMenuOpen(false)}>{t.nav.ai}</Link>
        <Link href={`/${locale}#commerce`} onClick={() => setMenuOpen(false)}>{t.nav.commerce}</Link>
        <Link href={`/${locale}#workflow`} onClick={() => setMenuOpen(false)}>{t.nav.workflow}</Link>
        <Link href={`/${locale}#pricing`} onClick={() => setMenuOpen(false)}>{t.nav.pricing}</Link>
        <Link className="mobile-extra" href={`/${locale}#solutions`} onClick={() => setMenuOpen(false)}>{t.nav.solutions}</Link>
        <Link className="mobile-extra" href={`/${locale}#faq`} onClick={() => setMenuOpen(false)}>{t.nav.faq}</Link>
        <Link className="mobile-login" href={`/${locale}/login`} onClick={() => setMenuOpen(false)}>{t.login}</Link>
        <Link className="mobile-register" href={`/${locale}/register`} onClick={() => setMenuOpen(false)}>{t.register} ↗</Link>
      </nav>
      <div className="header-right">
        <SiteControls locale={locale} initialTheme={initialTheme} />
        <Link className="header-login" href={`/${locale}/login`}>{t.login}</Link>
        <Link className="header-cta" href={`/${locale}/register`}>{t.register}<span aria-hidden="true">↗</span></Link>
        <button className="menu-toggle" type="button" aria-label={menuOpen ? t.closeMenu : t.menu} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><span /><span /></button>
      </div>
    </div>
  </header>;
}
