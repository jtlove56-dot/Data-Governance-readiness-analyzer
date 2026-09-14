import type { Metadata } from "next";
import { IBM_Plex_Mono, Libre_Franklin, Newsreader } from "next/font/google";
import "./globals.css";

const sans = Libre_Franklin({
  variable: "--font-sans",
  subsets: ["latin"],
});
const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Data Governance Readiness Analyzer",
  description: "A guided privacy and governance risk assessment for proposed data initiatives.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}

