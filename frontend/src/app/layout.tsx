import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";

import "./tailwind.css";

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
  twitter: {
    card: "summary_large_image",
    title: "KioskFlow - Modern POS System",
    description: "High-performance POS system built with Rust.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
