"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  UserCheck,
  UserMinus,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { PlatformStats } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Accent = "indigo" | "cyan" | "fuchsia" | "amber" | "emerald" | "rose";

const PALETTE: Record<
  Accent,
  {
    gradient: string;
    border: string;
    iconBg: string;
    text: string;
    valueGradient: string;
    bar: string;
  }
> = {
  indigo: {
    gradient: "from-indigo-500/12 via-violet-500/6 to-indigo-500/3",
    border: "border-indigo-500/30",
    iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
    text: "text-indigo-700 dark:text-indigo-300",
    valueGradient:
      "from-indigo-600 to-violet-600 dark:from-indigo-300 dark:to-violet-300",
    bar: "from-indigo-500 to-violet-500",
  },
  cyan: {
    gradient: "from-cyan-500/12 via-sky-500/6 to-cyan-500/3",
    border: "border-cyan-500/30",
    iconBg: "bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/30",
    text: "text-cyan-700 dark:text-cyan-300",
    valueGradient: "from-cyan-600 to-sky-600 dark:from-cyan-300 dark:to-sky-300",
    bar: "from-cyan-500 to-sky-500",
  },
  fuchsia: {
    gradient: "from-fuchsia-500/12 via-rose-500/6 to-fuchsia-500/3",
    border: "border-fuchsia-500/30",
    iconBg:
      "bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-500 shadow-fuchsia-500/30",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    valueGradient:
      "from-fuchsia-600 via-rose-500 to-amber-500 dark:from-fuchsia-300 dark:via-rose-300 dark:to-amber-300",
    bar: "from-fuchsia-500 via-rose-500 to-amber-500",
  },
  amber: {
    gradient: "from-amber-500/12 via-orange-500/6 to-amber-500/3",
    border: "border-amber-500/30",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
    valueGradient:
      "from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300",
    bar: "from-amber-500 to-orange-500",
  },
  emerald: {
    gradient: "from-emerald-500/12 via-teal-500/6 to-emerald-500/3",
    border: "border-emerald-500/30",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    valueGradient:
      "from-emerald-600 to-teal-600 dark:from-emerald-300 dark:to-teal-300",
    bar: "from-emerald-500 to-teal-500",
  },
  rose: {
    gradient: "from-rose-500/12 via-pink-500/6 to-rose-500/3",
    border: "border-rose-500/30",
    iconBg: "bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
    valueGradient: "from-rose-600 to-pink-600 dark:from-rose-300 dark:to-pink-300",
    bar: "from-rose-500 to-pink-500",
  },
};

const TIER_ACCENTS: Accent[] = ["indigo", "cyan", "fuchsia", "amber", "emerald"];

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api
      .getPlatformStats()
      .then(setStats)
      .catch((err) => {
        console.error("Failed to load platform stats:", err);
        if (err instanceof ApiError && err.status === 403) {
          router.push("/dashboard");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (!stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 px-8 py-6 text-center">
          <AlertTriangle className="mx-auto mb-2 size-6 text-rose-500" />
          <p className="font-semibold text-foreground">Failed to load platform stats</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please refresh the page or check your connection
          </p>
        </div>
      </div>
    );
  }

  const tierData = Object.entries(stats.users_by_tier).map(([slug, data]) => ({
    slug,
    ...data,
  }));
  const maxTierCount = Math.max(1, ...tierData.map((t) => t.count));
  const activePct =
    stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0;

  const userTypes = [
    {
      label: "Direct Users",
      value: stats.direct_users,
      icon: Users,
      accent: "indigo" as Accent,
    },
    {
      label: "Platform Users",
      value: stats.platform_users,
      icon: Globe,
      accent: "cyan" as Accent,
    },
    {
      label: "Super Admins",
      value: stats.super_admins,
      icon: ShieldCheck,
      accent: "amber" as Accent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Hero
        signups={stats.signups_last_7_days}
        running={stats.running_jobs}
        queued={stats.queued_jobs}
      />

      {/* FAILED JOBS BANNER */}
      {stats.failed_jobs_24h > 0 && (
        <FailedJobsBanner count={stats.failed_jobs_24h} />
      )}

      {/* KPI CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total Users"
          value={stats.total_users.toLocaleString()}
          accent="indigo"
          footer={
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                <UserCheck className="size-3" /> {stats.active_users} active
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                <UserMinus className="size-3" /> {stats.inactive_users} inactive
              </span>
            </div>
          }
        />

        <KpiCard
          icon={TrendingUp}
          label="Signups (7d)"
          value={`+${stats.signups_last_7_days}`}
          accent="fuchsia"
          footer={
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3 text-fuchsia-500" />
              New registrations this week
            </div>
          }
        />

        <KpiCard
          icon={Activity}
          label="Jobs (24h)"
          value={stats.jobs_last_24h.toLocaleString()}
          accent="cyan"
          footer={
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 font-bold text-indigo-700 dark:text-indigo-300">
                <PauseCircle className="size-3" /> {stats.queued_jobs} queued
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 font-bold text-cyan-700 dark:text-cyan-300">
                <PlayCircle className="size-3" /> {stats.running_jobs} running
              </span>
            </div>
          }
        />

        <KpiCard
          icon={FileText}
          label="Pages This Month"
          value={stats.pages_this_month.toLocaleString()}
          accent="amber"
          footer={
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="size-3 text-amber-500" />
              Total processed across all users
            </div>
          }
        />
      </div>

      {/* BREAKDOWN ROW */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* User types */}
        <Panel
          className="lg:col-span-2"
          icon={Building2}
          title="User Types"
          subtitle="Distribution by account type"
          accent="indigo"
        >
          <div className="space-y-3">
            {userTypes.map((row) => {
              const c = PALETTE[row.accent];
              return (
                <div
                  key={row.label}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border-2 bg-gradient-to-br p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md",
                    c.gradient,
                    c.border
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
                      c.iconBg
                    )}
                  >
                    <row.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-foreground">{row.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {((row.value / Math.max(1, stats.total_users)) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                  <div
                    className={cn(
                      "bg-gradient-to-br bg-clip-text text-2xl font-extrabold text-transparent",
                      c.valueGradient
                    )}
                  >
                    {row.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active vs Inactive bar */}
          <div className="mt-5 rounded-2xl border border-border/60 bg-card/50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="text-muted-foreground">Active users</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {activePct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm transition-all"
                style={{ width: `${activePct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{stats.active_users} active</span>
              <span>{stats.inactive_users} inactive</span>
            </div>
          </div>
        </Panel>

        {/* Users by tier (bar chart) */}
        <Panel
          className="lg:col-span-3"
          icon={Sparkles}
          title="Users by Tier"
          subtitle="Subscription distribution"
          accent="fuchsia"
          headerExtras={
            <Link
              href="/admin/users"
              className="group inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background transition-all hover:scale-[1.03] hover:opacity-90"
            >
              All users
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        >
          {tierData.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No tier data yet"
              subtitle="Subscriptions will appear here as users sign up."
            />
          ) : (
            <div className="space-y-3">
              {tierData.map((tier, idx) => {
                const accent = TIER_ACCENTS[idx % TIER_ACCENTS.length];
                const c = PALETTE[accent];
                const pct = (tier.count / maxTierCount) * 100;
                const totalPct =
                  stats.total_users > 0
                    ? (tier.count / stats.total_users) * 100
                    : 0;
                return (
                  <div
                    key={tier.slug}
                    className="rounded-2xl border border-border/60 bg-card/50 p-3.5 transition-colors hover:bg-card/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "size-2.5 shrink-0 rounded-full bg-gradient-to-br",
                            c.bar
                          )}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-foreground">
                            {tier.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {totalPct.toFixed(1)}% of all users
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 bg-gradient-to-br bg-clip-text text-xl font-extrabold text-transparent tabular-nums",
                          c.valueGradient
                        )}
                      >
                        {tier.count}
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r shadow-sm transition-all duration-700",
                          c.bar
                        )}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* SYSTEM HEALTH */}
      <Panel
        icon={CheckCircle2}
        title="System Health"
        subtitle="Real-time platform indicators"
        accent="emerald"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <HealthChip
            label="API Status"
            value="Operational"
            tone="ok"
          />
          <HealthChip
            label="Job Queue"
            value={`${stats.queued_jobs + stats.running_jobs} in-flight`}
            tone={stats.queued_jobs > 50 ? "warning" : "ok"}
          />
          <HealthChip
            label="Failed Jobs (24h)"
            value={`${stats.failed_jobs_24h}`}
            tone={
              stats.failed_jobs_24h === 0
                ? "ok"
                : stats.failed_jobs_24h < 5
                  ? "warning"
                  : "danger"
            }
          />
        </div>
      </Panel>
    </div>
  );
}

/* =============== COMPONENTS =============== */

function Hero({
  signups,
  running,
  queued,
}: {
  signups: number;
  running: number;
  queued: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-fuchsia-500/10 to-indigo-500/10 p-6 shadow-md sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 size-72 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-background/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 backdrop-blur dark:text-amber-300">
            <ShieldCheck className="size-3" />
            Super Admin Console
          </div>
          <h1 className="bg-gradient-to-br from-amber-600 via-fuchsia-500 to-indigo-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-amber-300 dark:via-fuchsia-300 dark:to-indigo-300 sm:text-4xl">
            Platform Overview
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Monitor system-wide health, growth, and usage at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-xs font-bold backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300">
            <TrendingUp className="size-3.5" />+{signups} signups · 7d
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
            <Activity className="size-3.5" />
            {running + queued} jobs in-flight
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  footer,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: Accent;
  footer?: React.ReactNode;
}) {
  const c = PALETTE[accent];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl",
        c.gradient,
        c.border
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-white/20 blur-2xl dark:bg-white/5" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <span className={cn("text-xs font-extrabold uppercase tracking-wider", c.text)}>
            {label}
          </span>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-110",
              c.iconBg
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
        <div
          className={cn(
            "bg-gradient-to-br bg-clip-text text-4xl font-extrabold tracking-tight text-transparent",
            c.valueGradient
          )}
        >
          {value}
        </div>
        {footer && <div className="pt-1">{footer}</div>}
      </div>
    </div>
  );
}

function Panel({
  children,
  className,
  icon: Icon,
  title,
  subtitle,
  accent,
  headerExtras,
}: {
  children: React.ReactNode;
  className?: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: Accent;
  headerExtras?: React.ReactNode;
}) {
  const c = PALETTE[accent];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 shadow-md backdrop-blur sm:p-6",
        className
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-2xl text-white shadow-lg",
              c.iconBg
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {headerExtras}
      </div>
      {children}
    </div>
  );
}

function HealthChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warning" | "danger";
}) {
  const toneMap = {
    ok: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: CheckCircle2,
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/5",
      dot: "bg-amber-500",
      ping: "bg-amber-400",
      text: "text-amber-700 dark:text-amber-300",
      icon: AlertTriangle,
    },
    danger: {
      border: "border-rose-500/40",
      bg: "bg-rose-500/5",
      dot: "bg-rose-500",
      ping: "bg-rose-400",
      text: "text-rose-700 dark:text-rose-300",
      icon: AlertTriangle,
    },
  }[tone];
  const Icon = toneMap.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border-2 p-3.5",
        toneMap.border,
        toneMap.bg
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2.5">
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-60",
              toneMap.ping
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full",
              toneMap.dot
            )}
          />
        </span>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className={cn("text-sm font-bold", toneMap.text)}>{value}</div>
        </div>
      </div>
      <Icon className={cn("size-4", toneMap.text)} />
    </div>
  );
}

function FailedJobsBanner({ count }: { count: number }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-amber-500/10 p-5 shadow-md">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-rose-500/20 blur-3xl" />
      <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Action required
            </div>
            <div className="mt-0.5 text-lg font-bold text-foreground">
              {count} failed job{count > 1 ? "s" : ""} in the last 24 hours
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              Investigate by drilling into individual user detail pages.
            </div>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-500/30 transition-all hover:scale-[1.03] hover:shadow-lg"
        >
          Investigate
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-6 py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-lg shadow-fuchsia-500/30">
        <Icon className="size-5" />
      </div>
      <div className="text-sm font-bold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-3xl lg:col-span-3" />
      </div>
    </div>
  );
}
