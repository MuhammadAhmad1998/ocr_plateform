"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { getToken, api } from "@/lib/api";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api.me()
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

  if (!userRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 lg:h-18 lg:px-8">
          <div className="flex items-center gap-8">
            <Logo href="/admin" />
            <nav className="hidden items-center gap-1 lg:flex">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                    {(pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))) && (
                      <span className="absolute inset-x-1 -bottom-[17px] h-0.5 rounded-t-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
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
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="space-y-1 px-4 py-4">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-3 text-base font-semibold transition-colors",
                      pathname === item.href || pathname.startsWith(`${item.href}/`)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
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

      {/* Content */}
      <main className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
