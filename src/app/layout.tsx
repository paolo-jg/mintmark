import type { Metadata } from "next";
import { Geist, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pedigree Coins — Professionally Graded Coins",
  description:
    "The marketplace for professionally graded rare coins. Buy and sell PCGS, NGC, and ANACS certified coins with confidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${dmSans.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://jlelkunjjbyitnknzhpp.supabase.co" />
        <link rel="dns-prefetch" href="https://jlelkunjjbyitnknzhpp.supabase.co" />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-dm-sans)]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
