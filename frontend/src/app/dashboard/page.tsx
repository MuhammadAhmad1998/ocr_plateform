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
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

type Job = {
  id: string;
  status: string;
  job_type: string;
  pages_processed: number;
  created_at: string;
};

type Usage = {
  quota_used: number;
  quota_limit: number;
  tier_name: string | null;
  jobs_this_month: number;
};

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "running", label: "Running" },
  { id: "queued", label: "Queued" },
  { id: "failed", label: "Failed" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["id"];

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatAbsolute(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_META: Record<
  string,
  { icon: typeof CheckCircle2; bar: string; pill: string; ring: string }
> = {
  completed: {
    icon: CheckCircle2,
    bar: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30",
    ring: "ring-emerald-500/40",
  },
  failed: {
    icon: XCircle,
    bar: "bg-rose-500",
    pill: "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-rose-500/30",
    ring: "ring-rose-500/40",
  },
  running: {
    icon: Loader2,
    bar: "bg-indigo-500",
    pill: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-500/30",
    ring: "ring-indigo-500/40",
  },
  queued: {
    icon: Clock,
    bar: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30",
    ring: "ring-amber-500/40",
  },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.queued;
}

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

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError(null);
      const results = await Promise.allSettled([
        api.getUsage(),
        api.getJobs(),
        api.getApiKeys(),
      ]);
      const [usageResult, jobsResult, keysResult] = results;

      if (usageResult.status === "fulfilled") setUsage(usageResult.value);
      if (jobsResult.status === "fulfilled") setJobs(jobsResult.value);
      if (keysResult.status === "fulfilled") setApiKeys(keysResult.value);

      const authFailure = results.some(
        (r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401
      );
      if (authFailure) {
        router.push("/login?next=/dashboard");
        return;
      }

      const allFailed = results.every((r) => r.status === "rejected");
      if (allFailed) {
        const first = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
        setError(
          first.reason instanceof Error
            ? first.reason.message
            : "Could not load dashboard data. Check that the API is running."
        );
      } else if (keysResult.status === "rejected") {
        setError("Usage loaded, but API keys could not be fetched. Try refreshing the page.");
      }

      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
        if (!allFailed) toast.success("Dashboard refreshed");
      }
    },
    [router]
  );

  useEffect(() => {
    if (!getToken()) {
      router.push("/login?next=/dashboard");
      return;
    }
    loadData();
  }, [router, loadData]);

  async function createKey() {
    try {
      const result = await api.createApiKey();
      setNewKey(result.key);
      setApiKeys(await api.getApiKeys());
      toast.success("API key generated");
    } catch {
      toast.error("Failed to generate API key");
    }
  }

  async function revokeKey(keyId: string) {
    try {
      await api.revokeApiKey(keyId);
      setApiKeys(await api.getApiKeys());
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    }
  }

  async function openBillingPortal() {
    try {
      const { portal_url } = await api.getBillingPortal();
      window.location.href = portal_url;
    } catch {
      toast.error("Failed to open billing portal");
    }
  }

  const usagePct = usage ? Math.min(100, (usage.quota_used / usage.quota_limit) * 100) : 0;
  const isNearLimit = usagePct >= 80;
  const isAtLimit = usagePct >= 100;
  const remainingPages = usage ? Math.max(0, usage.quota_limit - usage.quota_used) : 0;
  const activeKeyCount = apiKeys.filter((k) => k.is_active).length;
  const successJobs = useMemo(
    () => jobs.filter((j) => j.status === "completed").length,
    [jobs]
  );
  const failedJobs = useMemo(() => jobs.filter((j) => j.status === "failed").length, [jobs]);
  const successRate = jobs.length > 0 ? Math.round((successJobs / jobs.length) * 100) : 0;
  const filteredJobs = useMemo(
    () => (statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter)),
    [jobs, statusFilter]
  );

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    toast.success("Job ID copied");
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <BgOrbs />
        <Navbar />
        <main className="relative z-10 space-y-8 px-4 py-8 lg:px-8">
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BgOrbs />
      <Navbar />

      <main className="relative z-10 space-y-8 px-4 py-8 lg:px-8">
        {/* ============ HERO ============ */}
        <FadeIn>
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-emerald-500/10 p-6 shadow-xl sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-12 size-72 rounded-full bg-indigo-500/15 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-semibold text-foreground/70 backdrop-blur">
                  <Activity className="size-3 text-emerald-500" />
                  Live dashboard
                </div>
                <h1 className="bg-gradient-to-br from-indigo-600 via-cyan-600 to-emerald-600 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent dark:from-indigo-300 dark:via-cyan-300 dark:to-emerald-300 sm:text-5xl">
                  Welcome back
                </h1>
                <p className="max-w-xl text-base text-muted-foreground">
                  Monitor your usage, manage API keys, and track every OCR job in one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-2 bg-background/60 backdrop-blur"
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                >
                  <RefreshCcw className={cn("size-4", refreshing && "animate-spin")} />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-2 bg-background/60 backdrop-blur"
                  onClick={openBillingPortal}
                >
                  <ExternalLink className="size-4" />
                  Billing
                </Button>
                <Link
                  href="/docs"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-2 rounded-full border-2 bg-background/60 backdrop-blur"
                  )}
                >
                  API Docs
                </Link>
              </div>
            </div>

            {error && (
              <div className="relative mt-6 flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </section>
        </FadeIn>

        {/* ============ KPIs ============ */}
        <FadeIn delay={0.05}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Pages used"
              value={usage?.quota_used.toLocaleString() ?? "0"}
              hint={`of ${usage?.quota_limit.toLocaleString() ?? 0}`}
              icon={<TrendingUp className="size-5" />}
              accent={isAtLimit ? "rose" : isNearLimit ? "amber" : "indigo"}
            />
            <KpiCard
              label="Jobs this month"
              value={`${usage?.jobs_this_month ?? 0}`}
              hint={
                jobs.length > 0 ? `${successRate}% success rate` : "Run your first job"
              }
              icon={<Zap className="size-5" />}
              accent="cyan"
            />
            <KpiCard
              label="Active API keys"
              value={`${activeKeyCount}`}
              hint={`${apiKeys.length} total`}
              icon={<Key className="size-5" />}
              accent="emerald"
            />
            <KpiCard
              label="Current plan"
              value={usage?.tier_name || "Starter"}
              hint="Manage in billing"
              icon={<Sparkles className="size-5" />}
              accent="fuchsia"
            />
          </div>
        </FadeIn>

        {/* ============ NEAR-LIMIT BANNER ============ */}
        {isNearLimit && (
          <FadeIn delay={0.08}>
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border-2 p-5 shadow-xl",
                isAtLimit
                  ? "border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-orange-500/10 to-rose-500/15"
                  : "border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15"
              )}
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-amber-400/30 blur-3xl" />
              <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl text-white shadow-lg",
                      isAtLimit
                        ? "bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/40"
                        : "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/40"
                    )}
                  >
                    <AlertTriangle className="size-6" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {isAtLimit
                        ? "You've reached your monthly quota"
                        : `You've used ${Math.round(usagePct)}% of your quota`}
                    </p>
                    <p className="text-sm text-foreground/70">
                      {isAtLimit
                        ? "New jobs will fail until you upgrade or your quota resets."
                        : `Only ${remainingPages.toLocaleString()} pages left this cycle.`}
                    </p>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "shrink-0 gap-1.5 rounded-full bg-foreground text-background shadow-lg hover:opacity-90"
                  )}
                >
                  Upgrade plan <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </FadeIn>
        )}

        {/* ============ USAGE + API KEYS ============ */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* USAGE RING */}
          <FadeIn delay={0.1}>
            <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card to-muted/30 p-6 shadow-md">
              <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-indigo-500/15 blur-2xl" />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Monthly usage
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-foreground">
                      {usage?.tier_name || "Starter"} plan
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <UsageRing
                    percent={usagePct}
                    used={usage?.quota_used ?? 0}
                    limit={usage?.quota_limit ?? 0}
                    state={isAtLimit ? "danger" : isNearLimit ? "warning" : "ok"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-center text-xs">
                  <div className="rounded-xl bg-muted/50 px-3 py-2">
                    <p className="font-bold text-foreground">
                      {usage?.quota_used.toLocaleString() ?? 0}
                    </p>
                    <p className="text-muted-foreground">used</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2">
                    <p className="font-bold text-foreground">
                      {remainingPages.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground">remaining</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* API KEYS */}
          <FadeIn delay={0.15} className="lg:col-span-2">
            <div className="h-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-md">
              <div className="flex flex-col gap-4 border-b border-border/60 bg-gradient-to-r from-emerald-500/8 to-cyan-500/8 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30">
                    <Key className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">API Keys</h3>
                    <p className="text-xs text-muted-foreground">
                      Authenticate integrations and services
                    </p>
                  </div>
                </div>
                <Button
                  onClick={createKey}
                  size="sm"
                  className="gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/30 hover:scale-[1.02] hover:shadow-lg"
                >
                  <Key className="size-4" />
                  Generate Key
                </Button>
              </div>

              <div className="space-y-3 p-6">
                {newKey && (
                  <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-4 shadow-sm">
                    <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-400/30 blur-2xl" />
                    <div className="relative">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="size-4" />
                          Save this key — it won&apos;t be shown again
                        </p>
                        <button
                          type="button"
                          onClick={() => setNewKey(null)}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground">
                          {newKey}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 rounded-xl border-2 hover-scale"
                          onClick={() => {
                            navigator.clipboard.writeText(newKey);
                            toast.success("Copied to clipboard");
                          }}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {apiKeys.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30">
                      <Key className="size-5" />
                    </div>
                    <p className="text-sm font-bold text-foreground">No API keys yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Generate your first key to start integrating
                    </p>
                  </div>
                ) : (
                  apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-to-r from-muted/30 to-transparent px-4 py-3.5 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-110",
                            k.is_active
                              ? "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-emerald-500/30"
                              : "bg-gradient-to-br from-slate-400 to-slate-500"
                          )}
                        >
                          <Key className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{k.name}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {k.key_prefix}…
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            k.is_active
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {k.is_active ? "Active" : "Inactive"}
                        </span>
                        {k.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                            onClick={() => revokeKey(k.id)}
                            title="Revoke key"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ============ JOB HISTORY ============ */}
        <FadeIn delay={0.2}>
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-md">
            <div className="flex flex-col gap-4 border-b border-border/60 bg-gradient-to-r from-indigo-500/8 to-fuchsia-500/8 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30">
                  <Activity className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Job History</h3>
                  <p className="text-xs text-muted-foreground">
                    Recent OCR processing jobs
                    {failedJobs > 0 && (
                      <span className="ml-2 font-semibold text-rose-500">
                        · {failedJobs} failed
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => {
                  const count =
                    f.id === "all"
                      ? jobs.length
                      : jobs.filter((j) => j.status === f.id).length;
                  const isActive = statusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                        isActive
                          ? "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30"
                          : "border-border bg-background text-muted-foreground hover:border-indigo-500/40 hover:text-foreground"
                      )}
                    >
                      {f.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px]",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {filteredJobs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
                    <Activity className="size-6" />
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {statusFilter === "all" ? "No jobs yet" : `No ${statusFilter} jobs`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusFilter === "all"
                      ? "Run a document through the advisor or testing lab to get started"
                      : "Try a different status filter"}
                  </p>
                  {statusFilter === "all" && (
                    <div className="mt-5 flex justify-center gap-2">
                      <Link
                        href="/advisor"
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 hover:scale-[1.02]"
                        )}
                      >
                        <Sparkles className="size-3.5" />
                        Open advisor
                      </Link>
                      <Link
                        href="/testing"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1.5 rounded-full border-2"
                        )}
                      >
                        <FileSearch className="size-3.5" />
                        Open testing
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredJobs.map((j) => {
                    const meta = getStatusMeta(j.status);
                    const StatusIcon = meta.icon;
                    return (
                      <div
                        key={j.id}
                        className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-px hover:shadow-md"
                      >
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 w-1 rounded-l-2xl",
                            meta.bar
                          )}
                        />
                        <div className="flex flex-col gap-3 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:gap-5">
                          {/* Status badge */}
                          <div
                            className={cn(
                              "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1",
                              meta.pill
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                "size-3",
                                j.status === "running" && "animate-spin"
                              )}
                            />
                            {j.status}
                          </div>

                          {/* Job info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="font-mono text-xs font-semibold text-foreground">
                                {j.id.slice(0, 14)}…
                              </code>
                              <button
                                type="button"
                                onClick={() => copyId(j.id)}
                                className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                title="Copy full ID"
                              >
                                <Copy className="size-3" />
                              </button>
                              <span className="text-xs capitalize text-muted-foreground">
                                · {j.job_type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground" title={formatAbsolute(j.created_at)}>
                              {formatRelativeTime(j.created_at)}
                            </p>
                          </div>

                          {/* Pages */}
                          <div className="text-right">
                            <p className="text-lg font-extrabold tracking-tight text-foreground">
                              {j.pages_processed}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              pages
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

/* ============= COMPONENTS ============= */

function BgOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 top-10 size-96 rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/12" />
      <div className="absolute right-0 top-1/3 size-96 rounded-full bg-cyan-500/8 blur-3xl dark:bg-cyan-500/12" />
      <div className="absolute -bottom-20 left-1/3 size-96 rounded-full bg-fuchsia-500/8 blur-3xl dark:bg-fuchsia-500/12" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: "indigo" | "cyan" | "emerald" | "fuchsia" | "amber" | "rose";
}) {
  const palette = {
    indigo: {
      gradient: "from-indigo-500/15 via-violet-500/10 to-indigo-500/5",
      iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/30",
      ring: "border-indigo-500/30",
    },
    cyan: {
      gradient: "from-cyan-500/15 via-sky-500/10 to-cyan-500/5",
      iconBg: "bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/30",
      ring: "border-cyan-500/30",
    },
    emerald: {
      gradient: "from-emerald-500/15 via-teal-500/10 to-emerald-500/5",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
      ring: "border-emerald-500/30",
    },
    fuchsia: {
      gradient: "from-fuchsia-500/15 via-pink-500/10 to-fuchsia-500/5",
      iconBg: "bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/30",
      ring: "border-fuchsia-500/30",
    },
    amber: {
      gradient: "from-amber-500/15 via-yellow-500/10 to-amber-500/5",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
      ring: "border-amber-500/30",
    },
    rose: {
      gradient: "from-rose-500/15 via-orange-500/10 to-rose-500/5",
      iconBg: "bg-gradient-to-br from-rose-500 to-orange-500 shadow-rose-500/30",
      ring: "border-rose-500/30",
    },
  } as const;
  const c = palette[accent];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl",
        c.gradient,
        c.ring
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/20 blur-2xl dark:bg-white/5" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-xl text-white shadow-lg transition-transform group-hover:scale-110",
              c.iconBg
            )}
          >
            {icon}
          </div>
        </div>
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
        {hint && <p className="text-xs font-medium text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function UsageRing({
  percent,
  used,
  limit,
  state,
}: {
  percent: number;
  used: number;
  limit: number;
  state: "ok" | "warning" | "danger";
}) {
  const radius = 80;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;

  const gradientId =
    state === "danger" ? "ringRose" : state === "warning" ? "ringAmber" : "ringIndigo";

  return (
    <div className="relative">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        <defs>
          <linearGradient id="ringIndigo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241)" />
            <stop offset="100%" stopColor="rgb(6 182 212)" />
          </linearGradient>
          <linearGradient id="ringAmber" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(245 158 11)" />
            <stop offset="100%" stopColor="rgb(249 115 22)" />
          </linearGradient>
          <linearGradient id="ringRose" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(244 63 94)" />
            <stop offset="100%" stopColor="rgb(249 115 22)" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="currentColor"
          strokeWidth="14"
          fill="none"
          className="text-muted/60"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className={cn(
            "bg-gradient-to-br bg-clip-text text-4xl font-extrabold tracking-tight text-transparent",
            state === "danger" && "from-rose-500 to-orange-500",
            state === "warning" && "from-amber-500 to-orange-500",
            state === "ok" && "from-indigo-500 to-cyan-500"
          )}
        >
          {Math.round(percent)}%
        </p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
