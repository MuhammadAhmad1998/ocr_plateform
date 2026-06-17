"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

const appNav = [
  { href: "/advisor", label: "Advisor" },
  { href: "/testing", label: "Testing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
];

const PUBLIC_PATHS = ["/", "/login", "/register", "/docs", "/pricing"];

export function Navbar({ variant = "app" }: { variant?: "marketing" | "app" }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
  }, [pathname]);

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const showAppNav = loggedIn || !isPublicPage;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80 backdrop-blur-xl",
        variant === "marketing" ? "bg-background/80" : "bg-card/90"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 lg:h-18 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo href={loggedIn ? "/dashboard" : "/"} />
          {showAppNav && (
            <nav className="hidden items-center gap-1 lg:flex">
              {appNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                    pathname === item.href || (item.href !== "/docs" && pathname.startsWith(`${item.href}/`))
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  {(pathname === item.href ||
                    (item.href !== "/docs" && pathname.startsWith(`${item.href}/`))) && (
                    <span className="absolute inset-x-1 -bottom-[17px] h-0.5 rounded-t-full bg-primary" />
                  )}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!loggedIn && (
            <Link
              href="/docs"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden text-muted-foreground sm:inline-flex"
              )}
            >
              API Docs
            </Link>
          )}
          {loggedIn ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden gap-2 text-muted-foreground hover:text-foreground lg:flex"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/login";
                }}
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
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-primary shadow-sm transition-all hover:scale-105 hover:shadow-md"
                )}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {loggedIn && mobileMenuOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="space-y-1 px-4 py-4">
            {appNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-lg px-4 py-3 text-base font-semibold transition-colors",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-primary/10 text-primary"
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
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
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
