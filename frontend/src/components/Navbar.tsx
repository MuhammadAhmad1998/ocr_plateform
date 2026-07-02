"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
        "sticky top-0 z-50 border-b backdrop-blur-xl",
        "border-[rgb(var(--border))] bg-[rgb(var(--surface-1))/90]"
      )}
    >
      {/* Main bar */}
      <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
        {/* Brandmark */}
        <Logo href={loggedIn ? "/dashboard" : "/"} />

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[rgb(var(--surface-2))] text-[rgb(var(--teal))]"
                    : "text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text-1))]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {!authReady ? (
            <div className="h-8 w-20" aria-hidden />
          ) : loggedIn ? (
            <>
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(
                  "hidden items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors lg:flex",
                  "border-[rgb(var(--border-strong))] text-[rgb(var(--text-2))] hover:text-[rgb(var(--text-1))]"
                )}
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-[rgb(var(--text-2))] hover:text-[rgb(var(--text-1))] lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm text-[rgb(var(--text-2))] hover:text-[rgb(var(--text-1))] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  "bg-[rgb(var(--teal))] text-[rgb(var(--primary-foreground))]",
                  "hover:brightness-110"
                )}
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {loggedIn && mobileMenuOpen && (
        <div
          className="border-t lg:hidden"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1))" }}
        >
          <nav className="space-y-0.5 px-4 py-3">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[rgb(var(--surface-2))] text-[rgb(var(--teal))]"
                      : "text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text-1))]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-[rgb(var(--text-2))] hover:text-[rgb(var(--coral))] transition-colors"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
