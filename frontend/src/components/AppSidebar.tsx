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
import { clearTokens, isLoggedIn } from "@/lib/api";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const workspaceNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/advisor",   label: "Advisor",    icon: Sparkles },
  { href: "/testing",   label: "Testing",    icon: FlaskConical },
];

const resourcesNav: NavItem[] = [
  { href: "/docs",    label: "Docs",    icon: BookOpen },
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function handleSignOut() {
    clearTokens();
    setLoggedIn(false);
    window.location.href = "/login";
  }

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 backdrop-blur-xl lg:hidden"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--surface-1)/0.95)",
        }}
      >
        <Logo href={loggedIn ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md text-[rgb(var(--text-2))] hover:text-[rgb(var(--text-1))] transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((s) => !s)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0" style={{ background: "rgba(14,17,22,0.6)", backdropFilter: "blur(4px)" }} />
          <aside
            className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--surface-1))",
            }}
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
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[200px] flex-col border-r backdrop-blur-xl lg:flex"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--surface-1)/0.95)",
        }}
      >
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
      {/* Logo row */}
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <Logo href={loggedIn ? "/dashboard" : "/"} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-[rgb(var(--text-2))] hover:text-[rgb(var(--text-1))] transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {loggedIn && (
          <div>
            <SectionLabel>Overview</SectionLabel>
            {workspaceNav.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>
        )}

        <div>
          <SectionLabel>Account</SectionLabel>
          {resourcesNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>

      {/* Bottom strip */}
      <div className="border-t px-3 py-3 space-y-1" style={{ borderColor: "rgb(var(--border))" }}>
        {showThemeToggle && (
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-[rgb(var(--text-3))]">Theme</span>
            <ThemeToggle />
          </div>
        )}
        {authReady && loggedIn ? (
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[rgb(var(--text-2))] hover:text-[rgb(var(--coral))] hover:bg-[rgb(var(--coral-bg))] transition-colors"
          >
            <LogOut className="size-4 shrink-0" />
            Sign out
          </button>
        ) : authReady ? (
          <div className="space-y-1.5">
            <Link
              href="/login"
              className="block w-full rounded-md border px-3 py-2 text-center text-sm font-medium text-[rgb(var(--text-2))] hover:text-[rgb(var(--text-1))] transition-colors"
              style={{ borderColor: "rgb(var(--border-strong))" }}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="block w-full rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
              style={{
                background: "rgb(var(--teal))",
                color: "rgb(var(--primary-foreground))",
              }}
            >
              Get started
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[1px] text-[rgb(var(--text-3))]">
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
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm mb-0.5 transition-colors",
        active
          ? "bg-[rgb(var(--surface-2))] text-[rgb(var(--teal))]"
          : "text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text-1))]"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-[rgb(var(--teal))]" : "text-[rgb(var(--text-3))]")} />
      {item.label}
    </Link>
  );
}
