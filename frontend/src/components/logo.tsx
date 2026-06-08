import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary shadow-sm">
        <span className="text-sm font-bold tracking-tight text-primary-foreground">K</span>
        <div className="absolute -bottom-1 -right-1 size-3 rounded-full bg-accent" />
      </div>
      <span className="text-base font-semibold tracking-tight text-foreground">Klarix</span>
    </Link>
  );
}
