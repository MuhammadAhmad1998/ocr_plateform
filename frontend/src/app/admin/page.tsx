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
import { buttonVariants } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { PlatformStats } from "@/lib/api/types";
import { rh, iconBox } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

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
        <div className={cn(rh.card, "px-8 py-6 text-center")}>
          <AlertTriangle className="mx-auto mb-2 size-6 text-muted-foreground" />
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
    { label: "Direct Users", value: stats.direct_users, icon: Users },
    { label: "Platform Users", value: stats.platform_users, icon: Globe },
    { label: "Super Admins", value: stats.super_admins, icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <Hero
        signups={stats.signups_last_7_days}
        running={stats.running_jobs}
        queued={stats.queued_jobs}
      />

      {stats.failed_jobs_24h > 0 && (
        <FailedJobsBanner count={stats.failed_jobs_24h} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          label="Total Users"
          value={stats.total_users.toLocaleString()}
          footer={
            <div className="flex items-center gap-2 text-xs">
              <span className={cn(rh.badge, "gap-1 px-2 py-0.5 normal-case tracking-normal")}>
                <UserCheck className="size-3" /> {stats.active_users} active
              </span>
              <span className={cn(rh.badge, "gap-1 px-2 py-0.5 normal-case tracking-normal")}>
                <UserMinus className="size-3" /> {stats.inactive_users} inactive
              </span>
            </div>
          }
        />

        <KpiCard
          icon={TrendingUp}
          label="Signups (7d)"
          value={`+${stats.signups_last_7_days}`}
          footer={
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3" />
              New registrations this week
            </div>
          }
        />

        <KpiCard
          icon={Activity}
          label="Jobs (24h)"
          value={stats.jobs_last_24h.toLocaleString()}
          footer={
            <div className="flex items-center gap-2 text-xs">
              <span className={cn(rh.badge, "gap-1 px-2 py-0.5 normal-case tracking-normal")}>
                <PauseCircle className="size-3" /> {stats.queued_jobs} queued
              </span>
              <span className={cn(rh.badge, "gap-1 px-2 py-0.5 normal-case tracking-normal")}>
                <PlayCircle className="size-3" /> {stats.running_jobs} running
              </span>
            </div>
          }
        />

        <KpiCard
          icon={FileText}
          label="Pages This Month"
          value={stats.pages_this_month.toLocaleString()}
          footer={
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="size-3" />
              Total processed across all users
            </div>
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel
          className="lg:col-span-2"
          icon={Building2}
          title="User Types"
          subtitle="Distribution by account type"
        >
          <div className="space-y-3">
            {userTypes.map((row) => (
              <div
                key={row.label}
                className={cn(rh.cardHover, "flex items-center gap-3 p-3.5")}
              >
                <div className={iconBox("md")}>
                  <row.icon className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">{row.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {((row.value / Math.max(1, stats.total_users)) * 100).toFixed(1)}% of total
                  </div>
                </div>
                <div className={rh.statValue}>{row.value}</div>
              </div>
            ))}
          </div>

          <div className={cn(rh.card, "mt-5 p-4")}>
            <div className="mb-2 flex items-center justify-between">
              <span className={rh.label}>Active users</span>
              <span className="text-sm font-bold text-foreground">{activePct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${activePct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{stats.active_users} active</span>
              <span>{stats.inactive_users} inactive</span>
            </div>
          </div>
        </Panel>

        <Panel
          className="lg:col-span-3"
          icon={Sparkles}
          title="Users by Tier"
          subtitle="Subscription distribution"
          headerExtras={
            <Link
              href="/admin/users"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              All users
              <ArrowRight className="size-3" />
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
              {tierData.map((tier) => {
                const pct = (tier.count / maxTierCount) * 100;
                const totalPct =
                  stats.total_users > 0
                    ? (tier.count / stats.total_users) * 100
                    : 0;
                return (
                  <div key={tier.slug} className={cn(rh.cardHover, "p-3.5")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="size-2.5 shrink-0 rounded-full bg-foreground" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-foreground">
                            {tier.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {totalPct.toFixed(1)}% of all users
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-xl font-bold tabular-nums text-foreground">
                        {tier.count}
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-700"
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

      <Panel
        icon={CheckCircle2}
        title="System Health"
        subtitle="Real-time platform indicators"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <HealthChip label="API Status" value="Operational" />
          <HealthChip
            label="Job Queue"
            value={`${stats.queued_jobs + stats.running_jobs} in-flight`}
          />
          <HealthChip label="Failed Jobs (24h)" value={`${stats.failed_jobs_24h}`} />
        </div>
      </Panel>
    </div>
  );
}

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
    <div className={cn(rh.card, "p-6 sm:p-8")}>
      <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
        <div className="space-y-2">
          <span className={rh.badge}>
            <ShieldCheck className="size-3" />
            Super Admin Console
          </span>
          <h1 className={cn(rh.h1, "text-foreground")}>Platform Overview</h1>
          <p className={cn(rh.body, "text-muted-foreground")}>
            Monitor system-wide health, growth, and usage at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={rh.statusLive}>Live</span>
          <span className={rh.badge}>
            <TrendingUp className="size-3.5" />+{signups} signups · 7d
          </span>
          <span className={rh.badge}>
            <Activity className="size-3.5" />
            {running + queued} jobs in-flight
          </span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  footer,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className={cn(rh.cardHover, "p-5")}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={rh.label}>{label}</span>
          <div className={iconBox("md")}>
            <Icon className="size-5" />
          </div>
        </div>
        <div className={rh.statValue}>{value}</div>
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
  headerExtras,
}: {
  children: React.ReactNode;
  className?: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  headerExtras?: React.ReactNode;
}) {
  return (
    <div className={cn(rh.card, "p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={iconBox("md")}>
            <Icon className="size-5" />
          </div>
          <div>
            <h3 className={rh.h2}>{title}</h3>
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

function HealthChip({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(rh.card, "flex items-center justify-between gap-3 p-3.5")}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2.5">
          <span className="relative inline-flex size-2.5 rounded-full bg-foreground" />
        </span>
        <div>
          <div className={rh.label}>{label}</div>
          <div className="text-sm font-bold text-foreground">{value}</div>
        </div>
      </div>
      <CheckCircle2 className="size-4 text-muted-foreground" />
    </div>
  );
}

function FailedJobsBanner({ count }: { count: number }) {
  return (
    <div className={cn(rh.card, "p-5")}>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className={iconBox("lg")}>
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <div className={rh.label}>Action required</div>
            <div className="mt-0.5 text-lg font-bold text-foreground">
              {count} failed job{count > 1 ? "s" : ""} in the last 24 hours
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              Investigate by drilling into individual user detail pages.
            </div>
          </div>
        </div>
        <Link href="/admin/users" className={cn(buttonVariants({ size: "sm" }), "gap-2 shrink-0")}>
          Investigate
          <ArrowRight className="size-4" />
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <div className={cn(iconBox("lg"), "mb-3")}>
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
      <Skeleton className="h-36 w-full rounded-[20px]" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-[20px]" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-[20px] lg:col-span-2" />
        <Skeleton className="h-80 rounded-[20px] lg:col-span-3" />
      </div>
    </div>
  );
}
