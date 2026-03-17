import type { Metadata } from "next";
import { Exo_2, JetBrains_Mono, Oxanium } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const sans = Exo_2({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Oxanium({
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "1 Day 1 Game",
  description: "Guess the game from cumulative clues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", sans.variable, display.variable)}
    >
      <body className={`${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
