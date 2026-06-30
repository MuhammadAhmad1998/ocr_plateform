"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Key,
  Search,
  ShieldCheck,
  Sparkles,
  Users as UsersIcon,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminTierOptions, adminErrorMessage, type TierOption } from "@/app/admin/_utils";
import { api, getToken } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AdminUser } from "@/lib/api/types";
import { rh, iconBox } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

function getInitials(email: string, fullName: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

function formatTimeAgo(iso: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [tierSlug, setTierSlug] = useState<string | null>(null);
  const [tierOptions, setTierOptions] = useState<TierOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    fetchAdminTierOptions().then(setTierOptions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    api
      .listUsers({
        page,
        page_size: 20,
        search: search || undefined,
        active_only: activeOnly || undefined,
        tier_slug: tierSlug || undefined,
      })
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.total_pages);
        setTotal(data.total);
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        if (err instanceof ApiError && err.status === 403) {
          router.push("/dashboard");
        }
      })
      .finally(() => setLoading(false));
  }, [router, page, search, activeOnly, tierSlug]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleActiveOnly = (value: boolean) => {
    setActiveOnly(value);
    setPage(1);
  };

  const handleTierFilter = (value: string | null) => {
    setTierSlug(value);
    setPage(1);
  };

  const hasFilters = activeOnly || tierSlug !== null;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className={cn(rh.card, "p-6 sm:p-8")}>
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <span className={rh.badge}>
              <UsersIcon className="size-3" />
              User management
            </span>
            <h1 className={cn(rh.h1, "text-foreground")}>All Users</h1>
            <p className={cn(rh.body, "text-muted-foreground")}>
              Browse, search, and manage every account on the platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={rh.badge}>
              <UsersIcon className="size-3.5" />
              {total.toLocaleString()} total
            </span>
            <Link
              href="/admin"
              className={cn(rh.badge, "hover:text-foreground")}
            >
              <ArrowRight className="size-3 rotate-180" />
              Overview
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-12 rounded-xl border border-border bg-background pl-11 pr-11 text-base shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Filters
          </span>
          <FilterPill
            active={!activeOnly}
            onClick={() => handleActiveOnly(false)}
          >
            All users
          </FilterPill>
          <FilterPill
            active={activeOnly}
            onClick={() => handleActiveOnly(true)}
          >
            Active only
          </FilterPill>

          <span className="mx-1 hidden h-4 w-px bg-border sm:inline" />

          <FilterPill
            active={tierSlug === null}
            onClick={() => handleTierFilter(null)}
          >
            All tiers
          </FilterPill>
          {tierOptions.map((tier) => (
            <FilterPill
              key={tier.slug}
              active={tierSlug === tier.slug}
              onClick={() => handleTierFilter(tier.slug)}
            >
              {tier.name}
              {typeof tier.count === "number" && (
                <span className="ml-1 opacity-70">({tier.count})</span>
              )}
            </FilterPill>
          ))}

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                handleActiveOnly(false);
                handleTierFilter(null);
              }}
              className={cn(rh.badge, "ml-1 gap-1 px-2.5 py-1 normal-case tracking-normal hover:text-foreground")}
            >
              <X className="size-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      {loading && users.length === 0 ? (
        <UsersSkeleton />
      ) : users.length === 0 ? (
        <EmptyUsers search={search} />
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className={cn(rh.card, "flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row")}>
          <p className="text-sm text-muted-foreground">
            Page <span className="font-bold text-foreground">{page}</span> of{" "}
            <span className="font-bold text-foreground">{totalPages}</span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({total.toLocaleString()} users)
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =============== COMPONENTS =============== */

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-foreground text-primary-foreground"
          : "border border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const isAdmin = user.role === "super_admin";
  const initials = getInitials(user.email, user.full_name);
  const quotaPct = user.tier
    ? Math.min(100, (user.tier.quota_used / Math.max(1, user.tier.quota_limit)) * 100)
    : 0;

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className={cn(
        rh.cardHover,
        "group relative block p-5",
        !user.is_active && "opacity-80"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            iconBox("lg"),
            "text-base font-extrabold transition-transform group-hover:scale-105"
          )}
        >
          {initials}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-bold text-foreground">
              {user.email}
            </p>
            {isAdmin && (
              <span className={cn(rh.badge, "gap-1 px-2.5 py-0.5")}>
                <ShieldCheck className="size-3" />
                Super Admin
              </span>
            )}
            {user.is_platform_user && (
              <span className={cn(rh.badge, "gap-1 px-2.5 py-0.5")}>
                <Globe className="size-3" />
                Platform
              </span>
            )}
            {!user.is_active && (
              <span className={cn(rh.badge, "gap-1 px-2.5 py-0.5")}>
                <UserX className="size-3" />
                Inactive
              </span>
            )}
          </div>

          {user.full_name && (
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
          )}

          {user.tier && (
            <div className={cn(rh.card, "space-y-1.5 px-3.5 py-2.5")}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-foreground/80">
                  <Sparkles className="size-3" />
                  {user.tier.name}
                </span>
                <span className="font-bold tabular-nums text-muted-foreground">
                  {user.tier.quota_used.toLocaleString()} /{" "}
                  {user.tier.quota_limit.toLocaleString()} pages
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${Math.max(2, quotaPct)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5" />
              <span className="font-bold tabular-nums text-foreground/80">
                {user.jobs_this_month}
              </span>{" "}
              jobs this month
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Key className="size-3.5" />
              <span className="font-bold tabular-nums text-foreground/80">
                {user.api_key_count}
              </span>{" "}
              API key{user.api_key_count === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Right meta */}
        <div className="flex shrink-0 flex-col items-end gap-1 text-right text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3" />
            Joined {new Date(user.created_at).toLocaleDateString()}
          </div>
          {user.last_active && (
            <div className="inline-flex items-center gap-1.5">
              <Clock className="size-3" />
              Active {formatTimeAgo(user.last_active)}
            </div>
          )}
          <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </div>
    </Link>
  );
}

function EmptyUsers({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className={cn(iconBox("lg"), "mb-4")}>
        <UsersIcon className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">
        {search ? "No users match your search" : "No users yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {search
          ? `Try a different keyword — we couldn't find anything matching "${search}".`
          : "Once people sign up, they'll appear here."}
      </p>
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-3xl" />
      ))}
    </div>
  );
}
