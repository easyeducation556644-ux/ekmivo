export type Locale = "bn" | "en";

export const siteCopy = {
  en: {
    nav: { services: "Services", workflow: "How it works", principles: "Why Ekmivo" },
    login: "Log in", register: "Get started", theme: "Theme", language: "Language", menu: "Open menu", closeMenu: "Close menu",
    footerLine: "A clearer way to run conversations and commerce.",
    footerStatus: "Building the first release", rights: "All rights reserved.",
  },
  bn: {
    nav: { services: "সেবাগুলো", workflow: "যেভাবে কাজ করে", principles: "কেন Ekmivo" },
    login: "লগ ইন", register: "শুরু করুন", theme: "থিম", language: "ভাষা", menu: "মেনু খুলুন", closeMenu: "মেনু বন্ধ করুন",
    footerLine: "কথোপকথন ও ব্যবসার কাজ চালানোর পরিষ্কার উপায়।",
    footerStatus: "প্রথম রিলিজ তৈরি হচ্ছে", rights: "সর্বস্বত্ব সংরক্ষিত।",
  },
} as const;
