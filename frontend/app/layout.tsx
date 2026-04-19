import type { Metadata } from "next";

import { GlobalAudioController } from "@/components/layout/GlobalAudioController";
import { GlobalNav } from "@/components/layout/GlobalNav";

import "./globals.css";

export const metadata: Metadata = {
  title: "Aristotle",
  description: "Gamified course companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">
        <GlobalAudioController />
        {children}
        <GlobalNav />
      </body>
    </html>
  );
}
