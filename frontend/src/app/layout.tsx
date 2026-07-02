import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const inter = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Planet OCR — Every OCR engine. One intelligent answer.",
  description:
    "Upload a document and our agent benchmarks every engine — open-source and commercial — on your actual data, then routes to the winner.",
  icons: {
    icon:     [{ url: "/planet-ocr-logo.png", type: "image/png" }],
    apple:    "/planet-ocr-logo.png",
    shortcut: "/planet-ocr-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(fontSans.variable, inter.variable)}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
