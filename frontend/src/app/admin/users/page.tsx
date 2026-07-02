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
  CreditCard,
  Users as UsersIcon,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminTierOptions, type TierOption } from "@/app/admin/_utils";
import { api, getToken } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AdminUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, rgb(var(--teal)), rgb(var(--teal-deep)))",
  "linear-gradient(135deg, rgb(var(--green)), rgb(var(--teal)))",
  "linear-gradient(135deg, rgb(var(--amber)), rgb(var(--coral)))",
  "linear-gradient(135deg, rgb(var(--teal-deep)), rgb(var(--green)))",
  "linear-gradient(135deg, rgb(var(--coral)), rgb(var(--amber)))",
  "linear-gradient(135deg, rgb(var(--green)), rgb(var(--teal-deep)))",
] as const;

function getInitials(email: string, fullName: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

function avatarGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
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
    <div className="space-y-5">
      {/* HERO */}
      <div
        className="relative overflow-hidden rounded-xl p-6 sm:p-8"
        style={{
          background:
            "linear-gradient(135deg, rgb(var(--teal-bg)) 0%, rgba(31,37,48,0.6) 45%, rgb(var(--surface-1)) 100%)",
          border: "0.5px solid rgb(var(--border))",
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full blur-3xl"
          style={{ background: "rgba(31,184,181,0.12)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-12 size-72 rounded-full blur-3xl"
          style={{ background: "rgba(93,202,165,0.08)" }}
        />

        <div className="relative flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider"
              style={{
                background: "rgb(var(--teal-bg))",
                color: "rgb(var(--teal))",
                border: "0.5px solid rgb(var(--teal-border))",
              }}
            >
              <UsersIcon className="size-3" />
              User management
            </div>
            <h1
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ color: "rgb(var(--text-1))" }}
            >
              All Users
            </h1>
            <p className="text-sm" style={{ color: "rgb(var(--text-2))" }}>
              Browse, search, and manage every account on the platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium"
              style={{
                background: "rgb(var(--teal-bg))",
                color: "rgb(var(--teal))",
                border: "0.5px solid rgb(var(--teal-border))",
              }}
            >
              <UsersIcon className="size-3.5" />
              {total.toLocaleString()} total
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-110"
              style={{
                background: "rgb(var(--surface-2))",
                color: "rgb(var(--text-2))",
                border: "0.5px solid rgb(var(--border-strong))",
              }}
            >
              <ArrowRight className="size-3 rotate-180" />
              Overview
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-6">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2"
            style={{ color: "rgb(var(--text-3))" }}
          />
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-11 rounded-lg pl-11 pr-11 text-sm transition-all focus-visible:ring-2"
            style={{
              background: "rgb(var(--surface-2))",
              border: "0.5px solid rgb(var(--border-strong))",
              color: "rgb(var(--text-1))",
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
              style={{ color: "rgb(var(--text-3))" }}
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span
            className="font-mono text-[10px] font-medium uppercase tracking-wider"
            style={{ color: "rgb(var(--text-3))" }}
          >
            Filters
          </span>
          <FilterPill active={!activeOnly} onClick={() => handleActiveOnly(false)}>
            All users
          </FilterPill>
          <FilterPill active={activeOnly} onClick={() => handleActiveOnly(true)}>
            Active only
          </FilterPill>

          <span
            className="mx-1 hidden h-4 w-px sm:inline"
            style={{ background: "rgb(var(--border))" }}
          />

          <FilterPill active={tierSlug === null} onClick={() => handleTierFilter(null)}>
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
              className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:brightness-110"
              style={{
                background: "rgb(var(--coral-bg))",
                color: "rgb(var(--coral))",
                border: "0.5px solid rgb(var(--coral-border))",
              }}
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
        <div
          className="flex flex-col items-center justify-between gap-3 rounded-xl px-4 py-3 sm:flex-row"
          style={{
            background: "rgb(var(--surface-1))",
            border: "0.5px solid rgb(var(--border))",
          }}
        >
          <p className="text-sm" style={{ color: "rgb(var(--text-2))" }}>
            Page{" "}
            <span className="font-semibold" style={{ color: "rgb(var(--text-1))" }}>
              {page}
            </span>{" "}
            of{" "}
            <span className="font-semibold" style={{ color: "rgb(var(--text-1))" }}>
              {totalPages}
            </span>
            <span className="ml-1.5 text-xs" style={{ color: "rgb(var(--text-3))" }}>
              ({total.toLocaleString()} users)
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              size="sm"
              className="rounded-lg transition-all hover:brightness-110"
              style={{
                background: "rgb(var(--teal))",
                color: "rgb(var(--primary-foreground))",
              }}
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
      className="rounded-full px-3 py-1 text-xs font-medium transition-all"
      style={
        active
          ? {
              background: "rgb(var(--teal))",
              color: "rgb(var(--primary-foreground))",
            }
          : {
              background: "rgb(var(--surface-2))",
              color: "rgb(var(--text-2))",
              border: "0.5px solid rgb(var(--border-strong))",
            }
      }
    >
      {children}
    </button>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const isAdmin = user.role === "super_admin";
  const avatarBg = avatarGradient(user.id);
  const initials = getInitials(user.email, user.full_name);
  const quotaPct = user.tier
    ? Math.min(100, (user.tier.quota_used / Math.max(1, user.tier.quota_limit)) * 100)
    : 0;
  const quotaColor =
    quotaPct >= 90
      ? "rgb(var(--coral))"
      : quotaPct >= 70
        ? "rgb(var(--amber))"
        : "rgb(var(--green))";

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5",
        !user.is_active && "opacity-80"
      )}
      style={{
        background: isAdmin
          ? "linear-gradient(135deg, rgba(232,163,61,0.08) 0%, rgb(var(--surface-1)) 60%)"
          : "rgb(var(--surface-1))",
        border: isAdmin
          ? "0.5px solid rgba(232,163,61,0.35)"
          : "0.5px solid rgb(var(--border))",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
        style={{
          background: isAdmin
            ? "linear-gradient(180deg, rgb(var(--amber)), rgb(var(--teal)))"
            : !user.is_active
              ? "rgb(var(--coral))"
              : "rgb(var(--green))",
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white transition-transform group-hover:scale-105"
          style={{ background: avatarBg }}
        >
          {initials}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>
              {user.email}
            </p>
            {isAdmin && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
                style={{
                  background: "rgba(232,163,61,0.15)",
                  color: "rgb(var(--amber))",
                  border: "0.5px solid rgba(232,163,61,0.3)",
                }}
              >
                <ShieldCheck className="size-3" />
                Super Admin
              </span>
            )}
            {user.is_platform_user && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
                style={{
                  background: "rgb(var(--green-bg))",
                  color: "rgb(var(--green))",
                  border: "0.5px solid rgb(var(--green-border))",
                }}
              >
                <Globe className="size-3" />
                Platform
              </span>
            )}
            {!user.is_active && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
                style={{
                  background: "rgb(var(--coral-bg))",
                  color: "rgb(var(--coral))",
                  border: "0.5px solid rgb(var(--coral-border))",
                }}
              >
                <UserX className="size-3" />
                Inactive
              </span>
            )}
          </div>

          {user.full_name && (
            <p className="text-sm" style={{ color: "rgb(var(--text-2))" }}>
              {user.full_name}
            </p>
          )}

          {user.tier && (
            <div
              className="space-y-1.5 rounded-lg px-3.5 py-2.5"
              style={{
                background: "rgb(var(--surface-2))",
                border: "0.5px solid rgb(var(--border))",
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: "rgb(var(--text-1))" }}>
                  <Sparkles className="size-3" style={{ color: "rgb(var(--teal))" }} />
                  {user.tier.name}
                  {user.tier.status && (
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                      style={{
                        background: "rgb(var(--surface-1))",
                        color: "rgb(var(--text-3))",
                      }}
                    >
                      {user.tier.status}
                    </span>
                  )}
                  {user.tier.has_stripe_subscription && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                      style={{
                        background: "rgb(var(--teal-bg))",
                        color: "rgb(var(--teal))",
                        border: "0.5px solid rgb(var(--teal-border))",
                      }}
                    >
                      <CreditCard className="size-3" />
                      Stripe
                    </span>
                  )}
                </span>
                <span className="font-mono font-medium tabular-nums" style={{ color: "rgb(var(--text-2))" }}>
                  {user.tier.quota_used.toLocaleString()} /{" "}
                  {user.tier.quota_limit.toLocaleString()} pages
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{ background: "rgb(var(--surface-1))" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(2, quotaPct)}%`, background: quotaColor }}
                />
              </div>
            </div>
          )}

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
            style={{ color: "rgb(var(--text-2))" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5" style={{ color: "rgb(var(--teal))" }} />
              <span className="font-mono font-medium tabular-nums" style={{ color: "rgb(var(--text-1))" }}>
                {user.jobs_this_month}
              </span>{" "}
              jobs this month
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Key className="size-3.5" style={{ color: "rgb(var(--amber))" }} />
              <span className="font-mono font-medium tabular-nums" style={{ color: "rgb(var(--text-1))" }}>
                {user.api_key_count}
              </span>{" "}
              API key{user.api_key_count === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Right meta */}
        <div
          className="flex shrink-0 flex-col items-end gap-1 text-right text-xs"
          style={{ color: "rgb(var(--text-3))" }}
        >
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="size-3" />
            Joined {new Date(user.created_at).toLocaleDateString()}
          </div>
          {user.last_active && (
            <div className="inline-flex items-center gap-1.5">
              <Clock className="size-3" style={{ color: "rgb(var(--green))" }} />
              Active {formatTimeAgo(user.last_active)}
            </div>
          )}
          <ArrowRight
            className="mt-1 size-4 transition-transform group-hover:translate-x-1"
            style={{ color: "rgb(var(--text-3))" }}
          />
        </div>
      </div>
    </Link>
  );
}

function EmptyUsers({ search }: { search: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center"
      style={{
        background: "rgb(var(--surface-1))",
        border: "0.5px dashed rgb(var(--border-strong))",
      }}
    >
      <div
        className="mb-4 flex size-12 items-center justify-center rounded-lg text-white"
        style={{
          background: "linear-gradient(135deg, rgb(var(--teal)), rgb(var(--teal-deep)))",
        }}
      >
        <UsersIcon className="size-6" />
      </div>
      <h3 className="text-base font-semibold" style={{ color: "rgb(var(--text-1))" }}>
        {search ? "No users match your search" : "No users yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm" style={{ color: "rgb(var(--text-2))" }}>
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
        <Skeleton
          key={i}
          className="h-28 w-full rounded-xl"
          style={{ background: "rgb(var(--surface-1))" }}
        />
      ))}
    </div>
  );
}
