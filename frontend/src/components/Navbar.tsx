"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { clearTokens, isLoggedIn } from "@/lib/api";
import { cn } from "@/lib/utils";

const marketingNav = [
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
];

const appNav = [
  { href: "/advisor", label: "Advisor" },
  { href: "/testing", label: "Testing" },
  { href: "/dashboard", label: "Dashboard" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/docs" && pathname.startsWith(`${href}/`));
}

export function Navbar({ variant = "app" }: { variant?: "marketing" | "app" }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const syncAuth = useCallback(() => {
    setLoggedIn(isLoggedIn());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, [pathname, syncAuth]);

  const navItems = loggedIn ? [...appNav, ...marketingNav] : marketingNav;

  function handleSignOut() {
    clearTokens();
    setLoggedIn(false);
    window.location.href = "/login";
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border",
        variant === "marketing" ? "bg-background" : "bg-card"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 lg:h-18 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo href={loggedIn ? "/dashboard" : "/"} />
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                  isActive(pathname, item.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                {isActive(pathname, item.href) && (
                  <span className="absolute inset-x-1 -bottom-[17px] h-0.5 rounded-t-full bg-foreground" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!authReady ? (
            <div className="h-9 w-24" aria-hidden />
          ) : loggedIn ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden gap-2 text-muted-foreground hover:text-foreground lg:flex"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Sign In
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {loggedIn && mobileMenuOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="space-y-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-md px-4 py-3 text-base font-semibold transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
