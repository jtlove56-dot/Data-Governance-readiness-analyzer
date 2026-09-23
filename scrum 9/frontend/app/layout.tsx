import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karlsgate",
  description: "Describe your data use case with the Karlsgate data governance questionnaire."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
