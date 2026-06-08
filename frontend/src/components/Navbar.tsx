"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/advisor", label: "Advisor" },
  { href: "/testing", label: "Testing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkout", label: "Pricing" },
];

export function Navbar({ variant = "app" }: { variant?: "marketing" | "app" }) {
  const pathname = usePathname();
  const isAuth =
    pathname !== "/" && pathname !== "/login" && pathname !== "/register";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80 backdrop-blur-md",
        variant === "marketing" ? "bg-background/70" : "bg-card/80"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          {isAuth &&
            nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          <ThemeToggle />
          {isAuth ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
            >
              Sign out
            </Button>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Sign in
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-accent text-accent-foreground hover:bg-accent/90"
                )}
              >
                Get started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
