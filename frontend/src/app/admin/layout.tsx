"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearApiKey, clearTokens, getToken, api } from "@/lib/api";
import { cn } from "@/lib/utils";

type AdminNavItem = { href: string; label: string; icon: LucideIcon };

const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

const adminResourcesNav: AdminNavItem[] = [
  { href: "/admin/docs", label: "Docs", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/docs") {
    return pathname === "/admin/docs" || pathname.startsWith("/admin/docs/");
  }
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api
      .me()
      .then((user) => {
        if (user.role !== "super_admin") {
          router.push("/dashboard");
        } else {
          setUserRole(user.role);
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleSignOut() {
    clearTokens();
    clearApiKey();
    window.location.href = "/login";
  }

  if (!userRole) {
    return null;
  }

  const isDocsPage = pathname.startsWith("/admin/docs");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background lg:pl-72">
      <BgOrbs />

      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <Logo href="/admin" />
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
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border/60 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebarBody
              pathname={pathname}
              onSignOut={handleSignOut}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* DESKTOP FIXED SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl lg:flex">
        <AdminSidebarBody pathname={pathname} onSignOut={handleSignOut} />
      </aside>

      <main
        className={cn(
          "relative z-10",
          isDocsPage
            ? "px-0 py-0"
            : "container mx-auto max-w-7xl px-4 py-8 lg:px-8"
        )}
      >
        {children}
      </main>
    </div>
  );
}

function AdminSidebarBody({
  pathname,
  onSignOut,
  onClose,
}: {
  pathname: string;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <Logo href="/admin" />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="size-5" />
          </Button>
        )}
      </div>

      <div className="px-5 pt-5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/15 to-indigo-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <ShieldCheck className="size-3" />
          Super Admin
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Console
        </div>
        {adminNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "bg-gradient-to-r from-indigo-500/15 via-fuchsia-500/15 to-amber-500/15 text-foreground shadow-sm ring-1 ring-fuchsia-500/30"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  active
                    ? "text-fuchsia-500"
                    : "text-muted-foreground/70 group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}

        <div className="my-4 h-px bg-border/60" />

        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Resources
        </div>
        {adminResourcesNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
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
        })}
      </nav>

      <div className="border-t border-border/60 px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-0 size-[28rem] rounded-full bg-amber-500/8 blur-3xl dark:bg-amber-500/12" />
      <div className="absolute right-0 top-[15%] size-[28rem] rounded-full bg-fuchsia-500/8 blur-3xl dark:bg-fuchsia-500/12" />
      <div className="absolute left-1/4 top-[55%] size-[26rem] rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/12" />
      <div className="absolute -bottom-32 right-1/4 size-[28rem] rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-500/12" />
    </div>
  );
}
