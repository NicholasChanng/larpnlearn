import type { Metadata } from "next";

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
        {children}
        <GlobalNav />
      </body>
    </html>
  );
}
