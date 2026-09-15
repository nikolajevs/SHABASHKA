import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseLocale, translate } from "./i18n/shared";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get("shabashka_locale")?.value);
  return {
    title: translate(locale, "Gigs — услуги в Латвии"),
    description: translate(
      locale,
      "Специалисты и задания по всей Латвии. Договаривайтесь напрямую.",
    ),
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = parseLocale((await cookies()).get("shabashka_locale")?.value);
  return (
    <html lang={locale}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
