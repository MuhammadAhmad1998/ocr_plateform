import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <Image
        src="/planet-ocr-logo.png"
        alt="Planet OCR"
        width={480}
        height={160}
        className="h-20 w-auto object-contain lg:h-24"
        priority
      />
    </Link>
  );
}
