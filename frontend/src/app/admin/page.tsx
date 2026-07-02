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
  CreditCard,
  FileText,
  Globe,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import type { AdminTier, PlatformStats } from "@/lib/api/types";

const TIER_ACCENT_COLORS = ["rgb(var(--teal))", "rgb(var(--green))", "rgb(var(--amber))", "rgb(var(--coral))", "rgb(var(--text-2))"];

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([api.getPlatformStats(), api.getAdminTiers()])
      .then(([statsData, tiersData]) => {
        setStats(statsData);
        setTiers(tiersData.tiers);
      })
      .catch((err) => {
        console.error("Failed to load platform stats:", err);
        if (err instanceof ApiError && err.status === 403) router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
        <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-5">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" style={{ background: "rgb(var(--surface-1))" }} />
          <Skeleton className="h-72 rounded-xl lg:col-span-3" style={{ background: "rgb(var(--surface-1))" }} />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-xl p-8 text-center" style={{ background: "rgb(var(--coral-bg))", border: "0.5px solid rgb(var(--coral-border))" }}>
          <AlertTriangle className="mx-auto mb-2 size-6" style={{ color: "rgb(var(--coral))" }} />
          <p className="font-semibold" style={{ color: "rgb(var(--text-1))" }}>Failed to load platform stats</p>
        </div>
      </div>
    );
  }

  const tierData = Object.entries(stats.users_by_tier).map(([slug, data]) => ({ slug, ...data }));
  const maxTierCount = Math.max(1, ...tierData.map((t) => t.count));
  const activePct = stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0;
  const billing = stats.billing_summary;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div
        className="rounded-xl p-6"
        style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
      >
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div
              className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
              style={{ background: "rgba(232,163,61,0.15)", color: "rgb(var(--amber))", border: "0.5px solid rgba(232,163,61,0.3)" }}
            >
              <ShieldCheck className="size-3" /> Super Admin Console
            </div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>Platform Overview</h1>
            <p className="mt-0.5 text-sm" style={{ color: "rgb(var(--text-2))" }}>Monitor system-wide health, growth, and usage at a glance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium"
              style={{ background: "rgb(var(--green-bg))", color: "rgb(var(--green))", border: "0.5px solid rgb(var(--green-border))" }}
            >
              <span className="size-1.5 rounded-full animate-pulse" style={{ background: "rgb(var(--green))" }} />
              Live
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px]"
              style={{ background: "rgb(var(--teal-bg))", color: "rgb(var(--teal))", border: "0.5px solid rgb(var(--teal-border))" }}
            >
              <TrendingUp className="size-3" /> +{stats.signups_last_7_days} signups · 7d
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px]"
              style={{ background: "rgb(var(--surface-2))", color: "rgb(var(--text-2))", border: "0.5px solid rgb(var(--border-strong))" }}
            >
              <Activity className="size-3" /> {stats.running_jobs + stats.queued_jobs} jobs in-flight
            </span>
          </div>
        </div>
      </div>

      {/* Failed jobs banner */}
      {stats.failed_jobs_24h > 0 && (
        <div
          className="flex flex-col items-start justify-between gap-4 rounded-xl p-5 sm:flex-row sm:items-center"
          style={{ background: "rgb(var(--coral-bg))", border: "0.5px solid rgb(var(--coral-border))" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" style={{ color: "rgb(var(--coral))" }} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "rgb(var(--coral))" }}>Action required</div>
              <div className="mt-0.5 font-semibold" style={{ color: "rgb(var(--text-1))" }}>
                {stats.failed_jobs_24h} failed job{stats.failed_jobs_24h > 1 ? "s" : ""} in the last 24 hours
              </div>
            </div>
          </div>
          <Link
            href="/admin/users"
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:brightness-110"
            style={{ background: "rgb(var(--coral))", color: "#fff" }}
          >
            Investigate <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.total_users.toLocaleString()} sub={`${stats.active_users} active · ${stats.inactive_users} inactive`} color="rgb(var(--teal))" />
        <StatCard icon={TrendingUp} label="Signups (7d)" value={`+${stats.signups_last_7_days}`} sub="New registrations this week" color="rgb(var(--green))" />
        <StatCard icon={Activity} label="Jobs (24h)" value={stats.jobs_last_24h.toLocaleString()} sub={`${stats.queued_jobs} queued · ${stats.running_jobs} running`} color="rgb(var(--amber))" />
        <StatCard icon={FileText} label="Pages This Month" value={stats.pages_this_month.toLocaleString()} sub="Total processed across all users" color="rgb(var(--coral))" />
      </div>

      {/* Billing & Stripe */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4" style={{ color: "rgb(var(--teal))" }} />
            <div>
              <h3 className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>Billing & Stripe</h3>
              <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>Membership tiers, Stripe prices, and subscription health</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HealthChip
              label="Stripe API"
              value={billing.stripe_configured ? "Connected" : "Not configured"}
              tone={billing.stripe_configured ? "ok" : "danger"}
            />
            <HealthChip
              label="Webhooks"
              value={billing.webhook_configured ? "Verified" : "Missing secret"}
              tone={billing.webhook_configured ? "ok" : "warning"}
            />
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={CreditCard} label="Stripe Customers" value={billing.stripe_customers.toLocaleString()} sub="Users with a Stripe customer ID" color="rgb(var(--teal))" />
          <StatCard icon={CheckCircle2} label="Active Subscriptions" value={billing.active_stripe_subscriptions.toLocaleString()} sub="Paid plans currently active" color="rgb(var(--green))" />
          <StatCard icon={AlertTriangle} label="Past Due" value={billing.past_due_subscriptions.toLocaleString()} sub="Failed renewal payments" color="rgb(var(--amber))" />
          <StatCard icon={Activity} label="Webhook Events" value={billing.webhook_events_processed.toLocaleString()} sub="Processed Stripe events (deduped)" color="rgb(var(--coral))" />
        </div>

        <div className="border-t px-5 py-4" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgb(var(--text-2))" }}>
              Tier catalog ({billing.paid_tiers_with_stripe_price}/{billing.paid_tiers_total} paid tiers linked to Stripe)
            </p>
          </div>
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.slug}
                className="flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "rgb(var(--surface-2))", border: "0.5px solid rgb(var(--border))" }}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>{tier.name}</span>
                    <code className="rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ background: "rgb(var(--surface-1))", color: "rgb(var(--text-3))" }}>{tier.slug}</code>
                    {tier.is_paid_tier && (
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase"
                        style={{
                          background: tier.stripe_configured ? "rgb(var(--green-bg))" : "rgb(var(--coral-bg))",
                          color: tier.stripe_configured ? "rgb(var(--green))" : "rgb(var(--coral))",
                        }}
                      >
                        {tier.stripe_configured ? "Stripe linked" : "No Stripe price"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "rgb(var(--text-3))" }}>
                    {tier.quota_limit.toLocaleString()} pages/mo · {tier.user_count} subscriber{tier.user_count === 1 ? "" : "s"}
                  </p>
                </div>
                {tier.stripe_price_id ? (
                  <code className="truncate font-mono text-[11px]" style={{ color: "rgb(var(--text-2))" }} title={tier.stripe_price_id}>
                    {tier.stripe_price_id}
                  </code>
                ) : tier.is_paid_tier ? (
                  <span className="text-xs" style={{ color: "rgb(var(--coral))" }}>Run setup_stripe_prices.py</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* User types */}
        <div
          className="rounded-xl overflow-hidden lg:col-span-2"
          style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
        >
          <div className="flex items-center gap-2 border-b px-5 py-4" style={{ borderColor: "rgb(var(--border))" }}>
            <Building2 className="size-4" style={{ color: "rgb(var(--teal))" }} />
            <div>
              <h3 className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>User Types</h3>
              <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>Distribution by account type</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Direct Users",    value: stats.direct_users,   icon: Users,      color: "rgb(var(--teal))" },
              { label: "Platform Users",  value: stats.platform_users, icon: Globe,      color: "rgb(var(--green))" },
              { label: "Super Admins",    value: stats.super_admins,   icon: ShieldCheck, color: "rgb(var(--amber))" },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg p-3"
                  style={{ background: "rgb(var(--surface-2))", border: "0.5px solid rgb(var(--border))" }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" style={{ color: row.color }} />
                    <span className="text-sm" style={{ color: "rgb(var(--text-1))" }}>{row.label}</span>
                  </div>
                  <span className="font-mono text-lg font-semibold" style={{ color: row.color }}>{row.value}</span>
                </div>
              );
            })}
            <div className="pt-2">
              <div className="mb-1.5 flex items-center justify-between text-xs" style={{ color: "rgb(var(--text-2))" }}>
                <span>Active users</span>
                <span style={{ color: "rgb(var(--green))" }}>{activePct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgb(var(--surface-2))" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${activePct}%`, background: "rgb(var(--green))" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Users by tier */}
        <div
          className="rounded-xl overflow-hidden lg:col-span-3"
          style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
        >
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgb(var(--border))" }}>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" style={{ color: "rgb(var(--teal))" }} />
              <div>
                <h3 className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>Users by Tier</h3>
                <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>Subscription distribution</p>
              </div>
            </div>
            <Link href="/admin/users" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-110" style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}>
              All users <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {tierData.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: "rgb(var(--text-3))" }}>No tier data yet</div>
            ) : (
              tierData.map((tier, idx) => {
                const pct = (tier.count / maxTierCount) * 100;
                const totalPct = stats.total_users > 0 ? (tier.count / stats.total_users) * 100 : 0;
                const color = TIER_ACCENT_COLORS[idx % TIER_ACCENT_COLORS.length];
                return (
                  <div key={tier.slug} className="rounded-lg p-3.5" style={{ background: "rgb(var(--surface-2))", border: "0.5px solid rgb(var(--border))" }}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full" style={{ background: color }} />
                        <div>
                          <span className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>{tier.name}</span>
                          <span className="ml-2 font-mono text-[11px]" style={{ color: "rgb(var(--text-3))" }}>{totalPct.toFixed(1)}% of all users</span>
                        </div>
                      </div>
                      <span className="font-mono text-xl font-semibold" style={{ color }}>{tier.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgb(var(--surface-1))" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, pct)}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* System health */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
      >
        <div className="flex items-center gap-2 border-b px-5 py-4" style={{ borderColor: "rgb(var(--border))" }}>
          <CheckCircle2 className="size-4" style={{ color: "rgb(var(--green))" }} />
          <div>
            <h3 className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>System Health</h3>
            <p className="text-xs" style={{ color: "rgb(var(--text-2))" }}>Real-time platform indicators</p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <HealthChip label="API Status" value="Operational" tone="ok" />
          <HealthChip label="Job Queue" value={`${stats.queued_jobs + stats.running_jobs} in-flight`} tone={stats.queued_jobs > 50 ? "warning" : "ok"} />
          <HealthChip label="Failed Jobs (24h)" value={`${stats.failed_jobs_24h}`} tone={stats.failed_jobs_24h === 0 ? "ok" : stats.failed_jobs_24h < 5 ? "warning" : "danger"} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: LucideIcon; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl p-[18px]" style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm" style={{ color: "rgb(var(--text-2))" }}>{label}</span>
        <Icon className="size-4" style={{ color }} />
      </div>
      <div className="font-mono text-[28px] font-semibold" style={{ color: "rgb(var(--text-1))" }}>{value}</div>
      <div className="mt-1.5 font-mono text-xs" style={{ color: "rgb(var(--text-3))" }}>{sub}</div>
    </div>
  );
}

function HealthChip({ label, value, tone }: { label: string; value: string; tone: "ok" | "warning" | "danger" }) {
  const c = {
    ok:      { bg: "rgb(var(--green-bg))",  border: "rgb(var(--green-border))",  dot: "rgb(var(--green))",  text: "rgb(var(--green))" },
    warning: { bg: "rgba(232,163,61,0.1)",  border: "rgba(232,163,61,0.3)",      dot: "rgb(var(--amber))",  text: "rgb(var(--amber))" },
    danger:  { bg: "rgb(var(--coral-bg))",  border: "rgb(var(--coral-border))",  dot: "rgb(var(--coral))",  text: "rgb(var(--coral))" },
  }[tone];
  return (
    <div className="flex items-center justify-between rounded-lg p-3.5" style={{ background: c.bg, border: `0.5px solid ${c.border}` }}>
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: c.dot }} />
          <span className="relative inline-flex size-2.5 rounded-full" style={{ background: c.dot }} />
        </span>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "rgb(var(--text-3))" }}>{label}</div>
          <div className="text-sm font-semibold" style={{ color: c.text }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

