import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

import "../tailwind.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "KioskFlow - Nền tảng POS & ERP Cho F&B",
  description: "Hệ thống quản lý bán hàng (POS) thế hệ mới dành cho nhà hàng, quán cafe. Tối ưu vận hành với Rust & gRPC.",
  openGraph: {
    title: "KioskFlow - Nền tảng POS & ERP",
    description: "Giải pháp chuyển đổi số cho ngành F&B. Quản lý đa chi nhánh, kho bãi và nhân sự chuyên nghiệp.",
    url: "https://kioskflow.vn",
    siteName: "KioskFlow",
    locale: "vi_VN",
    type: "website",
  },
  manifest: "/manifest.json",
  themeColor: "#0F172A",
  twitter: {
    card: "summary_large_image",
    title: "KioskFlow - Modern POS System",
    description: "High-performance POS system built with Rust.",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'vi' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

