"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearApiKey, clearTokens, getToken, api } from "@/lib/api";
import { cn } from "@/lib/utils";

type AdminNavItem = { href: string; label: string; icon: LucideIcon };

const adminNav: AdminNavItem[] = [
  { href: "/admin",       label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users",    icon: Users },
];
const adminResourcesNav: AdminNavItem[] = [
  { href: "/admin/docs",  label: "Docs",     icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/docs") return pathname === "/admin/docs" || pathname.startsWith("/admin/docs/");
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.me()
      .then((user) => {
        if (user.role !== "super_admin") { router.push("/dashboard"); }
        else { setUserRole(user.role); }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function handleSignOut() {
    clearTokens(); clearApiKey();
    window.location.href = "/login";
  }

  if (!userRole) return null;

  const isDocsPage = pathname.startsWith("/admin/docs");

  return (
    <div className="relative min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
      {/* MOBILE TOP BAR */}
      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 backdrop-blur-xl lg:hidden"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1)/0.95)" }}
      >
        <Logo href="/admin" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md transition-colors"
            style={{ color: "rgb(var(--text-2))" }}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((s) => !s)}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(14,17,22,0.6)", backdropFilter: "blur(4px)" }} />
          <aside
            className="absolute inset-y-0 left-0 flex w-64 flex-col border-r"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebarBody pathname={pathname} onSignOut={handleSignOut} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* DESKTOP FIXED SIDEBAR */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[200px] flex-col border-r backdrop-blur-xl lg:flex"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1)/0.95)" }}
      >
        <AdminSidebarBody pathname={pathname} onSignOut={handleSignOut} />
      </aside>

      <main className={cn("relative z-10", isDocsPage ? "p-0" : "px-4 py-6 lg:px-8")}>
        {children}
      </main>
    </div>
  );
}

function AdminSidebarBody({
  pathname, onSignOut, onClose,
}: { pathname: string; onSignOut: () => void; onClose?: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgb(var(--border))" }}>
        <Logo href="/admin" />
        {onClose && (
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-md lg:hidden" style={{ color: "rgb(var(--text-2))" }}>
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="px-5 pt-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: "rgb(var(--amber))/0.15", color: "rgb(var(--amber))", border: "0.5px solid rgb(var(--amber))/0.3" }}
        >
          <ShieldCheck className="size-3" /> Super Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div>
          <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-3))" }}>Console</div>
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm mb-0.5 transition-colors",
                  active ? "bg-[rgb(var(--surface-2))] text-[rgb(var(--amber))]" : "text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text-1))]"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-[rgb(var(--amber))]" : "text-[rgb(var(--text-3))]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div>
          <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-3))" }}>Resources</div>
          {adminResourcesNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm mb-0.5 transition-colors",
                  active ? "bg-[rgb(var(--surface-2))] text-[rgb(var(--teal))]" : "text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text-1))]"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-[rgb(var(--teal))]" : "text-[rgb(var(--text-3))]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t px-3 py-3 space-y-1" style={{ borderColor: "rgb(var(--border))" }}>
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: "rgb(var(--text-3))" }}>Theme</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-[rgb(var(--coral-bg))] hover:text-[rgb(var(--coral))]"
          style={{ color: "rgb(var(--text-2))" }}
        >
          <LogOut className="size-4 shrink-0" /> Sign out
        </button>
      </div>
    </>
  );
}
