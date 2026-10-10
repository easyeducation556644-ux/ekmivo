import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthForm } from "../../../components/auth-form";

export const metadata: Metadata = { title: "Create account | Ekmivo" };

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "bn" && locale !== "en") notFound();
  return <AuthForm locale={locale} mode="register" />;
}
