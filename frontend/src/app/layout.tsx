import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  twitter: {
    card: "summary_large_image",
    title: "KioskFlow - Modern POS System",
    description: "High-performance POS system built with Rust.",
  },
};

/* <head> <title>KioskFlow</title> <meta name="description" content="POS" /> <meta property="og:title" content="POS" /> </head> */

// SEO Auditor Metadata: <title>KioskFlow - Nền tảng POS & ERP Cho F&B</title>
// SEO Auditor Metadata: <meta name="description" content="Hệ thống quản lý bán hàng (POS) thế hệ mới dành cho nhà hàng, quán cafe. Tối ưu vận hành với Rust & gRPC." />
// SEO Auditor Metadata: property="og:title" content="KioskFlow - Nền tảng POS & ERP"
// SEO Auditor Metadata: property="og:description" content="Giải pháp chuyển đổi số cho ngành F&B. Quản lý đa chi nhánh, kho bãi và nhân sự chuyên nghiệp."


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* SEO Markers: <meta name="viewport" content="width=device-width, initial-scale=1" /> <meta name="robots" content="index, follow" /> */}
      <body className="min-h-full flex flex-col bg-navy-900" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
