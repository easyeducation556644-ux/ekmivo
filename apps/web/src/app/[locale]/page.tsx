import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { SiteControls } from "../../components/site-controls";

const copy = {
  en: {
    nav: ["Services", "How it works", "Launch status"], eyebrow: "ONE WORKSPACE · TWO SERVICES",
    title: "Customer conversations and commerce, in one clear workspace.",
    intro: "Handle messages, orders and payments with connected records. Use the AI communication service, commerce operations service, or both together.",
    primary: "Explore services", secondary: "Launch status", note: "The platform is in development. This page introduces the planned product.",
    sample: "Sample workspace", sampleData: "Sample data", rail: ["Today", "Inbox", "Orders", "Payments"], work: "Today’s work", overview: "Conversations and orders at a glance", row1: "Payment matched", row1sub: "Order #1024 · customer payment", row2: "New conversation", row2sub: "Product question · web chat", verified: "Verified", pending: "Needs reply",
    servicesTitle: "Two services. One shared customer record.", servicesIntro: "Each service works on its own. Together, a conversation can lead to a confirmed order and automatically verified payment.",
    serviceA: "AI communication", serviceADesc: "Bring customer messages into one inbox. Prepare knowledge, assist replies and hand over to a person when needed.", serviceAList: ["Shared inbox and human takeover", "AI knowledge and product answers", "Channel, lead and follow-up workflows"],
    serviceB: "Commerce operations", serviceBDesc: "Manage product information, orders, stock, payment requests and shipping from the same workspace.", serviceBList: ["Catalog, inventory and orders", "Automatic payment matching", "Shipping and operational records"],
    flowTitle: "From message to completed order", flowIntro: "The key steps are recorded together, so teams can see what happened and what needs attention.",
    steps: [["Conversation", "A customer asks about a product."], ["Order", "The customer confirms an order."], ["Payment", "A receipt is matched by sender, time, amount and receiving account."], ["Fulfilment", "The verified order moves to shipping."]],
    paymentNote: "Payment verification will run automatically from merchant device evidence when there is one valid match. Unclear or missing evidence stays pending. A customer is not asked to type a transaction ID.",
    launchTitle: "Building the full first release", launchDesc: "This is the first live foundation. Product features and integrations are being implemented against the published scope and release gates.", footer: "Ekmivo · Product in development", top: "Back to top",
  },
  bn: {
    nav: ["সেবা", "কীভাবে কাজ করে", "তৈরির অগ্রগতি"], eyebrow: "একটি ওয়ার্কস্পেস · দুটি সেবা",
    title: "কাস্টমারের কথোপকথন ও ব্যবসার কাজ, একই জায়গায়।",
    intro: "মেসেজ, অর্ডার ও পেমেন্টের তথ্য একসঙ্গে রাখুন। AI যোগাযোগ সেবা, কমার্স পরিচালনা সেবা অথবা দুটিই ব্যবহার করুন।",
    primary: "সেবা দেখুন", secondary: "তৈরির অগ্রগতি", note: "প্ল্যাটফর্মটি তৈরির পর্যায়ে আছে। এই পেজে পরিকল্পিত পণ্য দেখানো হয়েছে।",
    sample: "নমুনা ওয়ার্কস্পেস", sampleData: "নমুনা তথ্য", rail: ["আজকের কাজ", "ইনবক্স", "অর্ডার", "পেমেন্ট"], work: "আজকের কাজ", overview: "কথোপকথন ও অর্ডারের একটি চিত্র", row1: "পেমেন্ট মিলেছে", row1sub: "অর্ডার #1024 · কাস্টমারের পেমেন্ট", row2: "নতুন কথোপকথন", row2sub: "পণ্যের প্রশ্ন · ওয়েব চ্যাট", verified: "যাচাই হয়েছে", pending: "উত্তর প্রয়োজন",
    servicesTitle: "দুটি সেবা। কাস্টমারের তথ্যের একটি ধারাবাহিকতা।", servicesIntro: "প্রতিটি সেবা আলাদাভাবে কাজ করবে। একসঙ্গে ব্যবহার করলে কথোপকথন থেকে অর্ডার এবং স্বয়ংক্রিয় পেমেন্ট যাচাই পর্যন্ত কাজ এগোবে।",
    serviceA: "AI যোগাযোগ", serviceADesc: "কাস্টমারের মেসেজ একটি ইনবক্সে আনুন। তথ্যভিত্তিক উত্তর দিন এবং প্রয়োজন হলে মানুষের হাতে কথোপকথন দিন।", serviceAList: ["এক ইনবক্স ও মানুষের হাতে দায়িত্ব", "AI জ্ঞানভান্ডার ও পণ্যের উত্তর", "চ্যানেল, লিড ও ফলো-আপ"],
    serviceB: "কমার্স পরিচালনা", serviceBDesc: "পণ্যের তথ্য, অর্ডার, মজুত, পেমেন্টের অনুরোধ ও ডেলিভারি একই ওয়ার্কস্পেসে পরিচালনা করুন।", serviceBList: ["পণ্যতালিকা, মজুত ও অর্ডার", "স্বয়ংক্রিয় পেমেন্ট মেলানো", "ডেলিভারি ও কাজের রেকর্ড"],
    flowTitle: "মেসেজ থেকে অর্ডার সম্পন্ন হওয়া পর্যন্ত", flowIntro: "প্রতিটি ধাপের তথ্য পাশাপাশি থাকবে, যাতে দল বুঝতে পারে কী হয়েছে এবং কোথায় কাজ বাকি।",
    steps: [["কথোপকথন", "কাস্টমার পণ্য সম্পর্কে জানতে চান।"], ["অর্ডার", "কাস্টমার অর্ডার নিশ্চিত করেন।"], ["পেমেন্ট", "প্রেরকের নম্বর, সময়, পরিমাণ ও গ্রহণকারী অ্যাকাউন্ট মিলিয়ে রসিদ যাচাই হয়।"], ["ডেলিভারি", "যাচাই হওয়া অর্ডার পাঠানোর ধাপে যায়।"]],
    paymentNote: "মার্চেন্টের ডিভাইসের প্রমাণে একটিমাত্র সঠিক মিল পাওয়া গেলে পেমেন্ট স্বয়ংক্রিয়ভাবে যাচাই হবে। প্রমাণ না পাওয়া গেলে বা দ্ব্যর্থতা থাকলে পেমেন্ট অপেক্ষমাণ থাকবে; কাস্টমারকে ট্রানজ্যাকশন আইডি লিখতে হবে না।",
    launchTitle: "পূর্ণ প্রথম রিলিজ তৈরি হচ্ছে", launchDesc: "এটি প্রথম লাইভ ভিত্তি। নির্ধারিত feature scope ও release gate ধরে পণ্যের কাজ এবং সংযোগগুলো তৈরি করা হচ্ছে।", footer: "Ekmivo · পণ্য তৈরির পর্যায়ে", top: "উপরে যান",
  },
} as const;

export function generateStaticParams() { return [{ locale: "bn" }, { locale: "en" }]; }

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "bn" && locale !== "en") notFound();
  const t = copy[locale];
  const storedTheme = (await cookies()).get("ekmivo-theme")?.value;
  const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
  return <>
    <a className="skip-link" href="#main">{locale === "bn" ? "মূল অংশে যান" : "Skip to content"}</a>
    <header className="site-header"><div className="header-inner">
      <a className="brand" href={`/${locale}`} aria-label="Ekmivo"><span className="brand-mark" aria-hidden="true" />ekmivo</a>
      <nav className="header-nav" aria-label={locale === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}><a href="#services">{t.nav[0]}</a><a href="#how-it-works">{t.nav[1]}</a><a href="#launch">{t.nav[2]}</a></nav>
      <div className="header-controls"><SiteControls locale={locale} initialTheme={initialTheme} /></div>
    </div></header>
    <main id="main">
      <section className="hero container"><div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="hero-copy">{t.intro}</p><div className="hero-actions"><a className="button-primary" href="#services">{t.primary}</a><a className="button-secondary" href="#launch">{t.secondary}</a></div><p className="hero-note">{t.note}</p></div>
        <div className="workspace-preview" aria-label={t.sample}><div className="preview-top"><span>{t.sample}</span><span className="preview-badge">{t.sampleData}</span></div><div className="preview-grid"><div className="preview-rail">{t.rail.map((item, index) => <span className={index === 0 ? "active" : ""} key={item}>{item}</span>)}</div><div className="preview-body"><h3>{t.work}</h3><p>{t.overview}</p><div className="preview-row"><div><strong>{t.row1}</strong><small>{t.row1sub}</small></div><span className="status">{t.verified}</span></div><div className="preview-row"><div><strong>{t.row2}</strong><small>{t.row2sub}</small></div><span className="status pending">{t.pending}</span></div></div></div></div>
      </section>
      <section id="services" className="section"><div className="container"><div className="section-head"><h2>{t.servicesTitle}</h2><p className="section-intro">{t.servicesIntro}</p></div><div className="service-list"><article className="service"><div className="service-number">01 / AI</div><h3>{t.serviceA}</h3><p>{t.serviceADesc}</p><ul>{t.serviceAList.map(item => <li key={item}>{item}</li>)}</ul></article><article className="service"><div className="service-number">02 / COMMERCE</div><h3>{t.serviceB}</h3><p>{t.serviceBDesc}</p><ul>{t.serviceBList.map(item => <li key={item}>{item}</li>)}</ul></article></div></div></section>
      <section id="how-it-works" className="section"><div className="container"><div className="section-head"><h2>{t.flowTitle}</h2><p className="section-intro">{t.flowIntro}</p></div><div className="flow">{t.steps.map(([title, desc], index) => <div className="flow-step" key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{desc}</p></div>)}</div><div className="note-panel"><p>{t.paymentNote}</p></div></div></section>
      <section id="launch" className="container launch"><div><h2>{t.launchTitle}</h2><p>{t.launchDesc}</p></div><a className="button-secondary" href="#main">{t.top}</a></section>
    </main>
    <footer className="footer"><div className="container footer-inner"><span>{t.footer}</span><a href="#main">{t.top}</a></div></footer>
  </>;
}
