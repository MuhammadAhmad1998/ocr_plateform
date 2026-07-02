"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileSearch,
  Key,
  Loader2,
  RefreshCcw,
  Sparkles,
  Trash2,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

type Job = {
  id: string; status: string; job_type: string;
  pages_processed: number; created_at: string;
};
type Usage = {
  quota_used: number; quota_limit: number;
  tier_name: string | null; jobs_this_month: number;
};
type ApiKey = { id: string; name: string; key_prefix: string; is_active: boolean; };

const STATUS_FILTERS = [
  { id: "all", label: "All" }, { id: "completed", label: "Completed" },
  { id: "running", label: "Running" }, { id: "queued", label: "Queued" },
  { id: "failed", label: "Failed" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_META: Record<string, { icon: typeof CheckCircle2; statusColor: string; label: string }> = {
  completed: { icon: CheckCircle2, statusColor: "rgb(var(--green))",   label: "completed" },
  failed:    { icon: XCircle,      statusColor: "rgb(var(--coral))",   label: "failed" },
  running:   { icon: Loader2,      statusColor: "rgb(var(--teal))",    label: "running" },
  queued:    { icon: Clock,        statusColor: "rgb(var(--amber))",   label: "queued" },
};
function getStatusMeta(s: string) { return STATUS_META[s] ?? STATUS_META.queued; }

const ALLOWED_STRIPE_PORTAL_HOSTS = ["billing.stripe.com", "checkout.stripe.com"];
function isAllowedStripePortalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return ALLOWED_STRIPE_PORTAL_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
  } catch { return false; }
}

/* Mockup bar chart data helper */
const CHART_BARS = [38, 46, 42, 58, 54, 30, 26, 62, 70, 66, 78, 88, 44, 40];
const CHART_LABELS = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];

export default function DashboardPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    const results = await Promise.allSettled([api.getUsage(), api.getJobs(), api.getApiKeys()]);
    const [ur, jr, kr] = results;
    if (ur.status === "fulfilled") setUsage(ur.value);
    if (jr.status === "fulfilled") setJobs(jr.value);
    if (kr.status === "fulfilled") setApiKeys(kr.value);
    const authFailure = results.some((r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401);
    if (authFailure) { router.push("/login?next=/dashboard"); return; }
    const allFailed = results.every((r) => r.status === "rejected");
    if (allFailed) {
      const first = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      setError(first.reason instanceof Error ? first.reason.message : "Could not load dashboard data.");
    }
    setLoading(false);
    if (isRefresh) { setRefreshing(false); if (!allFailed) toast.success("Dashboard refreshed"); }
  }, [router]);

  useEffect(() => {
    if (!getToken()) { router.push("/login?next=/dashboard"); return; }
    loadData();
  }, [router, loadData]);

  async function createKey() {
    try {
      const result = await api.createApiKey();
      setNewKey(result.key);
      setApiKeys(await api.getApiKeys());
      toast.success("API key generated");
    } catch { toast.error("Failed to generate API key"); }
  }

  async function revokeKey(keyId: string) {
    try {
      await api.revokeApiKey(keyId);
      setApiKeys(await api.getApiKeys());
      toast.success("API key revoked");
    } catch { toast.error("Failed to revoke API key"); }
  }

  async function openBillingPortal() {
    try {
      const { portal_url } = await api.getBillingPortal();
      if (!isAllowedStripePortalUrl(portal_url)) throw new Error("Unexpected billing portal URL");
      window.location.href = portal_url;
    } catch { toast.error("Failed to open billing portal"); }
  }

  const usagePct = usage ? Math.min(100, (usage.quota_used / usage.quota_limit) * 100) : 0;
  const isNearLimit = usagePct >= 80;
  const isAtLimit = usagePct >= 100;
  const remainingPages = usage ? Math.max(0, usage.quota_limit - usage.quota_used) : 0;
  const activeKeyCount = apiKeys.filter((k) => k.is_active).length;
  const successJobs = useMemo(() => jobs.filter((j) => j.status === "completed").length, [jobs]);
  const failedJobs = useMemo(() => jobs.filter((j) => j.status === "failed").length, [jobs]);
  const successRate = jobs.length > 0 ? Math.round((successJobs / jobs.length) * 100) : 0;
  const filteredJobs = useMemo(
    () => (statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter)),
    [jobs, statusFilter]
  );

  if (loading) {
    return (
      <div className="relative min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
        <AppSidebar />
        <main className="space-y-5 px-4 py-6 lg:px-8">
          <Skeleton className="h-32 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />)}
          </div>
          <Skeleton className="h-52 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
          <Skeleton className="h-52 rounded-xl" style={{ background: "rgb(var(--surface-1))" }} />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen lg:pl-[200px]" style={{ background: "rgb(var(--base))" }}>
      <AppSidebar />

      {/* ====== LAYOUT matching mockup Screen 3: sidebar + main ====== */}
      <main className="px-4 py-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "rgb(var(--text-1))" }}>Dashboard</h1>
            <p className="mt-0.5 text-sm" style={{ color: "rgb(var(--text-2))" }}>
              {usage?.tier_name || "Starter"} plan · production workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-[rgb(var(--surface-2))]"
              style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}
            >
              <RefreshCcw className={cn("size-3.5", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={openBillingPortal}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-[rgb(var(--surface-2))]"
              style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}
            >
              <ExternalLink className="size-3.5" />
              Billing
            </button>
            <Link
              href="/docs"
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-[rgb(var(--surface-2))]"
              style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}
            >
              API Docs
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-5 flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
            style={{ background: "rgb(var(--coral-bg))", border: "0.5px solid rgb(var(--coral-border))", color: "rgb(var(--coral))" }}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Near-limit banner */}
        {isNearLimit && (
          <div
            className="mb-5 flex items-center justify-between gap-4 rounded-lg px-5 py-4"
            style={{
              background: isAtLimit ? "rgb(var(--coral-bg))" : "rgb(var(--amber-ink)/0.15)",
              border: `0.5px solid ${isAtLimit ? "rgb(var(--coral-border))" : "rgb(var(--amber))/0.4"}`,
            }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0" style={{ color: isAtLimit ? "rgb(var(--coral))" : "rgb(var(--amber))" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "rgb(var(--text-1))" }}>
                  {isAtLimit ? "You've reached your monthly quota" : `You've used ${Math.round(usagePct)}% of your quota`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgb(var(--text-2))" }}>
                  {isAtLimit ? "New jobs will fail until you upgrade." : `Only ${remainingPages.toLocaleString()} pages left.`}
                </p>
              </div>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:brightness-110"
              style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}
            >
              Upgrade <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        )}

        {/* Stats grid — matches mockup 4-column layout */}
        <div className="mb-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Documents this month" value={usage?.quota_used.toLocaleString() ?? "0"} delta="▲ 12% vs last month" deltaColor="rgb(var(--green))" />
          <StatCard label="Avg cost / 1k pages" value="$6.40" delta="▼ 8% (smart routing)" deltaColor="rgb(var(--green))" />
          <StatCard label="Avg latency" value="1.8s" delta="p95: 4.2s" deltaColor="rgb(var(--text-2))" />
          <StatCard label="Spend this month" value="$308" delta="est. $390 / mo" deltaColor="rgb(var(--text-2))" />
        </div>

        {/* Chart panel */}
        <Panel
          title="Documents processed — last 14 days"
          extra={<span className="keytag">live</span>}
          className="mb-5"
        >
          <div className="px-5 pb-4">
            <div className="flex h-[120px] items-end gap-1.5">
              {CHART_BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 min-h-1 rounded-t-sm transition-opacity hover:opacity-100"
                  style={{
                    height: `${h}%`,
                    background: h > 50 ? "rgb(var(--teal))" : "rgb(var(--border-strong))",
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {CHART_LABELS.map((l, i) => (
                <span
                  key={i}
                  className="flex-1 text-center font-mono text-[10px]"
                  style={{ color: "rgb(var(--text-3))" }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        {/* API Keys + Plan Usage — side by side */}
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          {/* API Keys */}
          <Panel
            title="API keys"
            extra={
              <button
                type="button"
                onClick={createKey}
                className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-[rgb(var(--surface-2))]"
                style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}
              >
                + Create key
              </button>
            }
          >
            <div className="px-5 pb-2">
              {newKey && (
                <div
                  className="mb-3 rounded-lg p-3"
                  style={{ background: "rgb(var(--teal-bg))", border: "0.5px solid rgb(var(--teal-border))" }}
                >
                  <p className="mb-2 text-xs font-semibold" style={{ color: "rgb(var(--teal))" }}>
                    ✓ Save this key — it won&apos;t be shown again
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs" style={{ background: "rgb(var(--surface-2))", borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-1))" }}>
                      {newKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}
                      className="flex size-7 items-center justify-center rounded-md border transition-colors hover:bg-[rgb(var(--surface-2))]"
                      style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => setNewKey(null)} className="mt-2 text-[11px] hover:underline" style={{ color: "rgb(var(--text-3))" }}>Dismiss</button>
                </div>
              )}

              {apiKeys.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: "rgb(var(--text-3))" }}>
                  <Key className="mx-auto mb-2 size-6" style={{ color: "rgb(var(--text-3))" }} />
                  No API keys yet
                </div>
              ) : (
                apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="keyrow flex items-center justify-between py-3 border-b last:border-0"
                    style={{ borderColor: "rgb(var(--border))" }}
                  >
                    <div>
                      <div className="mb-0.5 text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>{k.name}</div>
                      <span className="font-mono text-xs" style={{ color: "rgb(var(--text-2))" }}>{k.key_prefix}…</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="keytag"
                        style={!k.is_active ? { background: "rgb(var(--surface-2))", color: "rgb(var(--text-2))", borderColor: "rgb(var(--border-strong))" } : {}}
                      >
                        {k.is_active ? "live" : "inactive"}
                      </span>
                      {k.is_active && (
                        <button
                          type="button"
                          onClick={() => revokeKey(k.id)}
                          className="flex size-7 items-center justify-center rounded-md transition-colors hover:text-[rgb(var(--coral))]"
                          style={{ color: "rgb(var(--text-3))" }}
                          title="Revoke key"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          {/* Plan Usage */}
          <Panel title="Plan usage" extra={<span className="font-mono text-xs" style={{ color: "rgb(var(--text-2))" }}>{usage?.tier_name || "Starter"} plan · {usage?.quota_limit.toLocaleString() ?? 0} included</span>}>
            <div className="px-5 pb-5 space-y-4">
              <UsageBar
                label="Documents"
                used={usage?.quota_used ?? 0}
                limit={usage?.quota_limit ?? 0}
                pct={usagePct}
              />
              <UsageBar
                label="Jobs this month"
                used={usage?.jobs_this_month ?? 0}
                limit={Math.max(usage?.jobs_this_month ?? 0, 1)}
                pct={100}
                compact
              />
            </div>
          </Panel>
        </div>

        {/* Job History */}
        <Panel
          title="Job history"
          extra={
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((f) => {
                const count = f.id === "all" ? jobs.length : jobs.filter((j) => j.status === f.id).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors"
                    style={{
                      background: statusFilter === f.id ? "rgb(var(--teal))" : "rgb(var(--surface-1))",
                      borderColor: statusFilter === f.id ? "rgb(var(--teal))" : "rgb(var(--border-strong))",
                      color: statusFilter === f.id ? "rgb(var(--primary-foreground))" : "rgb(var(--text-2))",
                    }}
                  >
                    {f.label}
                    <span
                      className="rounded-full px-1.5 font-mono text-[10px]"
                      style={{ background: "rgba(255,255,255,0.15)" }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          }
        >
          <div className="px-5 pb-4">
            {filteredJobs.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="mx-auto mb-3 size-8" style={{ color: "rgb(var(--text-3))" }} />
                <p className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>
                  {statusFilter === "all" ? "No jobs yet" : `No ${statusFilter} jobs`}
                </p>
                <p className="mt-1 text-xs" style={{ color: "rgb(var(--text-3))" }}>
                  {statusFilter === "all" ? "Run a document through the advisor to get started" : "Try a different filter"}
                </p>
                {statusFilter === "all" && (
                  <div className="mt-4 flex justify-center gap-2">
                    <Link href="/advisor" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:brightness-110" style={{ background: "rgb(var(--teal))", color: "rgb(var(--primary-foreground))" }}>
                      <Sparkles className="size-3.5" /> Open advisor
                    </Link>
                    <Link href="/testing" className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-[rgb(var(--surface-2))]" style={{ borderColor: "rgb(var(--border-strong))", color: "rgb(var(--text-2))" }}>
                      <FileSearch className="size-3.5" /> Open testing
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {filteredJobs.map((j) => {
                  const meta = getStatusMeta(j.status);
                  const StatusIcon = meta.icon;
                  return (
                    <div
                      key={j.id}
                      className="usrow flex items-center justify-between border-b py-3 last:border-0"
                      style={{ borderColor: "rgb(var(--border))" }}
                    >
                      {/* Status */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex size-5 shrink-0 items-center justify-center rounded-full"
                          style={{ background: `${meta.statusColor}20`, color: meta.statusColor }}
                        >
                          <StatusIcon className={cn("size-3", j.status === "running" && "animate-spin")} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono text-xs font-medium" style={{ color: "rgb(var(--text-1))" }}>
                              {j.id.slice(0, 14)}…
                            </code>
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(j.id); toast.success("Job ID copied"); }}
                              className="rounded p-0.5 transition-colors hover:text-[rgb(var(--text-1))]"
                              style={{ color: "rgb(var(--text-3))" }}
                            >
                              <Copy className="size-3" />
                            </button>
                            <span className="text-xs capitalize" style={{ color: "rgb(var(--text-2))" }}>
                              · {j.job_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: "rgb(var(--text-3))" }} title={formatAbsolute(j.created_at)}>
                            {formatRelativeTime(j.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold font-mono" style={{ color: "rgb(var(--text-1))" }}>{j.pages_processed}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "rgb(var(--text-3))" }}>pages</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
      </main>
    </div>
  );
}

/* ============= COMPONENTS ============= */

function StatCard({
  label, value, delta, deltaColor,
}: { label: string; value: string; delta: string; deltaColor: string }) {
  return (
    <div
      className="rounded-xl p-[18px]"
      style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
    >
      <div className="mb-2 text-sm" style={{ color: "rgb(var(--text-2))" }}>{label}</div>
      <div className="font-mono text-[26px] font-semibold" style={{ color: "rgb(var(--text-1))" }}>{value}</div>
      <div className="mt-1.5 font-mono text-xs" style={{ color: deltaColor }}>{delta}</div>
    </div>
  );
}

function Panel({
  title, extra, children, className,
}: { title: string; extra?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{ background: "rgb(var(--surface-1))", border: "0.5px solid rgb(var(--border))" }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3.5"
        style={{ borderColor: "rgb(var(--border))" }}
      >
        <h3 className="text-sm font-medium" style={{ color: "rgb(var(--text-1))" }}>{title}</h3>
        {extra && <div>{extra}</div>}
      </div>
      {children}
    </div>
  );
}

function UsageBar({
  label, used, limit, pct, compact,
}: { label: string; used: number; limit: number; pct: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: "rgb(var(--text-2))" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgb(var(--surface-2))" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: "rgb(var(--teal))" }}
        />
      </div>
      {!compact && (
        <span className="font-mono text-xs shrink-0" style={{ color: "rgb(var(--text-2))" }}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      )}
      {compact && (
        <span className="font-mono text-xs shrink-0" style={{ color: "rgb(var(--text-2))" }}>
          {used.toLocaleString()}
        </span>
      )}
    </div>
  );
}
