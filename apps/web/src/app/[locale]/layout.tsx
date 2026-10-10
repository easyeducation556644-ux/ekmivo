import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{locale:string}> }): Promise<Metadata> {
 const {locale}=await params;
 const bn=locale==="bn";
 const title=bn?"Ekmivo — মেসেজ থেকে অর্ডার, পেমেন্ট থেকে ডেলিভারি":"Ekmivo — From conversations to commerce";
 const description=bn
  ?"AI কথোপকথন, কমার্স, স্বয়ংক্রিয় পেমেন্ট যাচাই ও ডেলিভারি—দুটি স্বাধীন সেবা, একটি সংযুক্ত ব্যবসার অভিজ্ঞতা। Ekmivo প্রথম রিলিজের প্রিভিউ।"
  :"Explore the future Ekmivo workspace for AI communication, orders, evidence-based payment verification and fulfilment. Product preview, not a live business integration.";
 return {title,description,openGraph:{title,description,type:"website",siteName:"Ekmivo"}};
}

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SiteHeader } from "../../components/site-header";
import { SiteFooter } from "../../components/site-footer";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "bn" && locale !== "en") notFound();
  const storedTheme = (await cookies()).get("ekmivo-theme")?.value;
  const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
  return <><SiteHeader locale={locale} initialTheme={initialTheme} />{children}<SiteFooter locale={locale} /></>;
}
