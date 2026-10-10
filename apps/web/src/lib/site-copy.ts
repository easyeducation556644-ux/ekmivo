export type Locale = "bn" | "en";

export const siteCopy = {
 en: {
  nav: {services:"Services",workflow:"How it works",principles:"Trust",ai:"AI Communication",commerce:"Commerce",pricing:"Plans",solutions:"Solutions",faq:"FAQ"},
  login:"Log in", register:"Explore release", theme:"Theme", language:"Language", menu:"Open menu", closeMenu:"Close menu",
  footerLine:"Two independent services. One connected way to run conversations and commerce.",
  footerStatus:"First release in development", rights:"All rights reserved.",
 },
 bn: {
  nav: {services:"সেবাগুলো",workflow:"যেভাবে কাজ করে",principles:"আস্থা",ai:"AI যোগাযোগ",commerce:"কমার্স",pricing:"প্ল্যান",solutions:"সমাধান",faq:"প্রশ্নোত্তর"},
  login:"লগ ইন",register:"রিলিজ দেখুন",theme:"থিম",language:"ভাষা",menu:"মেনু খুলুন",closeMenu:"মেনু বন্ধ করুন",
  footerLine:"দুটি স্বাধীন সেবা। কথোপকথন আর কমার্স পরিচালনার একটি সংযুক্ত অভিজ্ঞতা।",
  footerStatus:"প্রথম রিলিজ তৈরি হচ্ছে", rights:"সর্বস্বত্ব সংরক্ষিত।",
 }
} as const;
