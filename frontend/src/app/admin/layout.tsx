"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
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
import { rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

type AdminNavItem = { href: string; label: string; icon: LucideIcon };

const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

function isActive(pathname: string, href: string) {
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

  return (
    <div className="min-h-screen bg-background lg:pl-72">
      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
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
          <div className="absolute inset-0 bg-background/70" />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-lg"
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border bg-card lg:flex">
        <AdminSidebarBody pathname={pathname} onSignOut={handleSignOut} />
      </aside>

      <main className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
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
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
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
        <span className={cn(rh.badge, "gap-1.5")}>
          <ShieldCheck className="size-3" />
          Super Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <div className={cn(rh.label, "px-3 pb-2")}>Console</div>
        {adminNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
          <span className="text-xs font-semibold text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}
