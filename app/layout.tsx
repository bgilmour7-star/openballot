import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth/server";
import Feedback from "@/components/Feedback";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Openballot · Start with the issues. Choose the person.",
  description: "A neutral guide to your 2026 local and provincial votes in British Columbia. Rank the issues first, then see which candidates speak to them.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1D1B2B" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en-CA">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="top">
          <div className="wrap wide">
            <Link href="/" className="brand"><span className="dot" aria-hidden />Openballot <span className="tag">Alpha</span></Link>
            <nav className="top">
              <Link href="/votes">Elections</Link>
              {user ? <Link href="/account">Account</Link> : <Link href="/signin">Sign in</Link>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="bottom">
          <div className="wrap wide stack">
            <p>Openballot is an independent, non-partisan alpha. It isn&apos;t run by any government, party or candidate, and it never tells you who to vote for. Always check official sources before you vote.</p>
            <div className="row">
              <Link href="/about">How it works</Link>
              <Link href="/privacy">Privacy</Link>
              <Feedback />
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
