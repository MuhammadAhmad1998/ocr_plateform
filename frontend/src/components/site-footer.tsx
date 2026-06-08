import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <Logo />
          <p className="max-w-md text-sm text-muted-foreground">
            Document intelligence that recommends the right OCR tier — and proves it on your data.
          </p>
        </div>
        <Separator />
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Klarix. All rights reserved.</span>
          <span>Secure processing · Stripe billing · API-ready</span>
        </div>
      </div>
    </footer>
  );
}
