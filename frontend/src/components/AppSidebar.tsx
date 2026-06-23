"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearTokens, isLoggedIn } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const workspaceNav: NavItem[] = [
  { href: "/advisor", label: "Advisor", icon: Sparkles },
  { href: "/testing", label: "Testing", icon: FlaskConical },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const resourcesNav: NavItem[] = [
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/docs" && pathname.startsWith(`${href}/`));
}

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleSignOut() {
    clearTokens();
    setLoggedIn(false);
    window.location.href = "/login";
  }

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/70 bg-card/95 px-4 backdrop-blur-xl lg:hidden">
        <Logo href={loggedIn ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((s) => !s)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border/70 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarBody
              pathname={pathname}
              loggedIn={loggedIn}
              authReady={authReady}
              onSignOut={handleSignOut}
              onClose={() => setMobileOpen(false)}
              showThemeToggle
            />
          </aside>
        </div>
      )}

      {/* DESKTOP FIXED SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/70 bg-card/95 backdrop-blur-xl lg:flex">
        <SidebarBody
          pathname={pathname}
          loggedIn={loggedIn}
          authReady={authReady}
          onSignOut={handleSignOut}
          showThemeToggle
        />
      </aside>
    </>
  );
}

function SidebarBody({
  pathname,
  loggedIn,
  authReady,
  onSignOut,
  onClose,
  showThemeToggle,
}: {
  pathname: string;
  loggedIn: boolean;
  authReady: boolean;
  onSignOut: () => void;
  onClose?: () => void;
  showThemeToggle?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <Logo href={loggedIn ? "/dashboard" : "/"} />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden"
          >
            <X className="size-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {loggedIn && (
          <>
            <SectionLabel>Workspace</SectionLabel>
            {workspaceNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
              />
            ))}
            <div className="my-4 h-px bg-border/60" />
          </>
        )}

        <SectionLabel>Resources</SectionLabel>
        {resourcesNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="border-t border-border/60 px-3 py-3">
        {showThemeToggle && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        )}
        {authReady && loggedIn ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
            onClick={onSignOut}
          >
            <LogOut className="size-4" />
            Sign Out
          </Button>
        ) : authReady ? (
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full rounded-xl bg-muted/60 px-3 py-2 text-center text-sm font-semibold text-foreground hover:bg-muted"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="w-full rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
        active
          ? "bg-gradient-to-r from-indigo-500/15 via-cyan-500/15 to-fuchsia-500/15 text-foreground shadow-sm ring-1 ring-indigo-500/20"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-4 transition-colors",
          active
            ? "text-indigo-500"
            : "text-muted-foreground/70 group-hover:text-foreground"
        )}
      />
      {item.label}
    </Link>
  );
}
