import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ekmivo — Conversations and commerce",
  description: "One workspace for customer conversations, orders and automatic payment verification.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-ekmivo-locale") === "en" ? "en" : "bn";
  const theme = requestHeaders.get("cookie")?.match(/(?:^|;\s*)ekmivo-theme=(light|dark)(?:;|$)/)?.[1];
  return <html lang={locale} data-theme={theme} suppressHydrationWarning><body>{children}</body></html>;
}
