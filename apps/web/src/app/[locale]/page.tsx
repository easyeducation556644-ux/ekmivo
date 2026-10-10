import { notFound } from "next/navigation";
import { MarketingExperience } from "../../components/landing/marketing-experience";

export function generateStaticParams() { return [{ locale: "bn" }, { locale: "en" }]; }

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
 const {locale} = await params;
 if (locale !== "bn" && locale !== "en") notFound();
 return <>
  <a className="skip-link" href="#main">{locale === "bn" ? "মূল অংশে যান" : "Skip to content"}</a>
  <MarketingExperience locale={locale} />
 </>;
}
