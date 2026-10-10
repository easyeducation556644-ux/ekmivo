import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthForm } from "../../../components/auth-form";

export const metadata: Metadata = { title: "Log in | Ekmivo" };

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "bn" && locale !== "en") notFound();
  return <AuthForm locale={locale} mode="login" />;
}
