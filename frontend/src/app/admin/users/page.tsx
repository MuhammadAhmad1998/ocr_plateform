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
import { cn } from "@/lib/utils";

const ACCENTS = [
  "from-indigo-500 to-violet-500 shadow-indigo-500/30",
  "from-fuchsia-500 via-rose-500 to-amber-500 shadow-fuchsia-500/30",
  "from-cyan-500 to-sky-500 shadow-cyan-500/30",
  "from-emerald-500 to-teal-500 shadow-emerald-500/30",
  "from-amber-500 to-orange-500 shadow-amber-500/30",
  "from-rose-500 to-pink-500 shadow-rose-500/30",
] as const;

function getInitials(email: string, fullName: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

function avatarAccent(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
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
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/10 to-amber-500/10 p-6 shadow-md sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 size-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/40 bg-background/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-fuchsia-700 backdrop-blur dark:text-fuchsia-300">
              <UsersIcon className="size-3" />
              User management
            </div>
            <h1 className="bg-gradient-to-br from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-indigo-300 dark:via-fuchsia-300 dark:to-amber-300 sm:text-4xl">
              All Users
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Browse, search, and manage every account on the platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <UsersIcon className="size-3.5" />
              {total.toLocaleString()} total
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-bold text-muted-foreground backdrop-blur hover:text-foreground"
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
            className="h-12 rounded-2xl border-2 border-border/60 bg-background/80 pl-11 pr-11 text-base shadow-sm backdrop-blur transition-all focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
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
              className="ml-1 inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition-colors hover:bg-rose-500/15 dark:text-rose-300"
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
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur sm:flex-row">
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
              className="rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-md shadow-fuchsia-500/30 hover:scale-[1.02]"
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
        "rounded-full px-3 py-1 text-xs font-bold transition-all",
        active
          ? "bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-md shadow-fuchsia-500/30"
          : "border border-border/60 bg-background/70 text-muted-foreground hover:border-fuchsia-500/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const isAdmin = user.role === "super_admin";
  const avatarCls = avatarAccent(user.id);
  const initials = getInitials(user.email, user.full_name);
  const quotaPct = user.tier
    ? Math.min(100, (user.tier.quota_used / Math.max(1, user.tier.quota_limit)) * 100)
    : 0;
  const quotaTone =
    quotaPct >= 90
      ? "from-rose-500 to-pink-500"
      : quotaPct >= 70
        ? "from-amber-500 to-orange-500"
        : "from-emerald-500 to-teal-500";

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl border-2 bg-card/70 p-5 shadow-md backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-xl",
        isAdmin
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/8 via-fuchsia-500/5 to-background"
          : !user.is_active
            ? "border-border/60 opacity-80"
            : "border-border/60 hover:border-fuchsia-500/40"
      )}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b",
          isAdmin
            ? "from-amber-500 via-fuchsia-500 to-indigo-500"
            : !user.is_active
              ? "from-rose-500 to-pink-500"
              : "from-emerald-500 to-teal-500"
        )}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-extrabold text-white shadow-lg transition-transform group-hover:scale-105",
            avatarCls
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
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-fuchsia-500 to-indigo-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                <ShieldCheck className="size-3" />
                Super Admin
              </span>
            )}
            {user.is_platform_user && (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                <Globe className="size-3" />
                Platform
              </span>
            )}
            {!user.is_active && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                <UserX className="size-3" />
                Inactive
              </span>
            )}
          </div>

          {user.full_name && (
            <p className="text-sm text-muted-foreground">{user.full_name}</p>
          )}

          {user.tier && (
            <div className="space-y-1.5 rounded-2xl border border-border/60 bg-background/50 px-3.5 py-2.5 backdrop-blur">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-foreground/80">
                  <Sparkles className="size-3 text-fuchsia-500" />
                  {user.tier.name}
                </span>
                <span className="font-bold tabular-nums text-muted-foreground">
                  {user.tier.quota_used.toLocaleString()} /{" "}
                  {user.tier.quota_limit.toLocaleString()} pages
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r shadow-sm transition-all",
                    quotaTone
                  )}
                  style={{ width: `${Math.max(2, quotaPct)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5 text-indigo-500" />
              <span className="font-bold tabular-nums text-foreground/80">
                {user.jobs_this_month}
              </span>{" "}
              jobs this month
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Key className="size-3.5 text-fuchsia-500" />
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
              <Clock className="size-3 text-emerald-500" />
              Active {formatTimeAgo(user.last_active)}
            </div>
          )}
          <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-fuchsia-500" />
        </div>
      </div>
    </Link>
  );
}

function EmptyUsers({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-card/40 px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-lg shadow-fuchsia-500/30">
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
