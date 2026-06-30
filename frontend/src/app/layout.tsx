import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Planet OCR — Intelligent OCR, matched to your documents",
  description:
    "Chat with our AI advisor, get a personalized tier recommendation, and optionally test with live OCR results before you commit.",
  icons: {
    icon: [
      { url: "/planet-ocr-logo.png", type: "image/png" },
    ],
    apple: "/planet-ocr-logo.png",
    shortcut: "/planet-ocr-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", manrope.variable, jetbrainsMono.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
