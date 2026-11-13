import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "SIMON & SPECK, explained",
  description:
    "A student project on the NSA's SIMON and SPECK lightweight block ciphers: how they work, a live demo of all 20 versions, and what we found.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line py-6 text-center text-sm text-muted">
          SIMON &amp; SPECK study project · Based on Beaulieu et al., NSA, 2013 (IACR ePrint 2013/404) · For learning, not for
          protecting real data
        </footer>
      </body>
    </html>
  );
}
