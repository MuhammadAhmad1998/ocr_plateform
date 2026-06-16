import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Klarix — Intelligent OCR, matched to your documents",
  description:
    "Upload a sample document, get an AI-powered tier recommendation, and see live OCR results before you commit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
