import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const locale = (await cookies()).get("ekmivo-locale")?.value;
  redirect(locale === "en" ? "/en" : "/bn");
}
