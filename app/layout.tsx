import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHABASHKA — услуги в Латвии",
  description: "Специалисты и задания по всей Латвии. Договаривайтесь напрямую.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}


