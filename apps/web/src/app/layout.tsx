import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { Toaster } from "@/components/toaster";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lucenta: Website Analyzer, AI Detector & Rewriter",
    template: "%s · Lucenta",
  },
  description:
    "Analyze any website's performance, SEO, security and accessibility, detect AI-written text, and rewrite it to sound naturally human.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
