"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type Theme = "system" | "light" | "dark";

export function SiteControls({ locale, initialTheme }: { locale: "bn" | "en"; initialTheme: Theme }) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function changeTheme(next: Theme) {
    setTheme(next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = next;
    document.cookie = `ekmivo-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  function changeLocale(next: "bn" | "en") {
    if (next === locale) return;
    document.cookie = `ekmivo-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.push(pathname.replace(/^\/(bn|en)(?=\/|$)/, `/${next}`));
  }

  return <>
    <label htmlFor="site-locale" className="sr-only">{locale === "bn" ? "ভাষা" : "Language"}</label>
    <select id="site-locale" className="select-control" value={locale} onChange={event => changeLocale(event.target.value as "bn" | "en")}>
      <option value="bn">বাংলা</option><option value="en">EN</option>
    </select>
    <label htmlFor="site-theme" className="sr-only">{locale === "bn" ? "রঙের ধরন" : "Theme"}</label>
    <select id="site-theme" className="select-control" value={theme} onChange={event => changeTheme(event.target.value as Theme)}>
      <option value="system">{locale === "bn" ? "সিস্টেম" : "System"}</option>
      <option value="light">{locale === "bn" ? "হালকা" : "Light"}</option>
      <option value="dark">{locale === "bn" ? "গাঢ়" : "Dark"}</option>
    </select>
  </>;
}
