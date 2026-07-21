import type { Metadata, Viewport } from "next";
import Layout from "@/components/Layout";
import AppProviders from "@/components/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生手记",
  description: "记录人生，理解自己",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "人生手记" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1,
  userScalable: false, themeColor: "#fefdfb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <AppProviders><Layout>{children}</Layout></AppProviders>
      </body>
    </html>
  );
}
