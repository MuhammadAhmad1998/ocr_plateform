"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Key,
  Loader2,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  User as UserIcon,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminErrorMessage,
  fetchAdminTierOptions,
  type TierOption,
} from "@/app/admin/_utils";
import { api, getToken } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import type { AdminUserDetail } from "@/lib/api/types";
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

const STATUS_TONES = {
  completed: "emerald",
  succeeded: "emerald",
  failed: "rose",
  running: "cyan",
  queued: "amber",
  processing: "cyan",
  cancelled: "rose",
} as const;

function statusAccent(status: string): Accent {
  const key = status.toLowerCase() as keyof typeof STATUS_TONES;
  return (STATUS_TONES[key] ?? "indigo") as Accent;
}

function getInitials(email: string, fullName: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  }
  return email.slice(0, 2).toUpperCase();
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tierOptions, setTierOptions] = useState<TierOption[]>([]);
  const [tierSaving, setTierSaving] = useState(false);
  const [quotaSaving, setQuotaSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    fetchAdminTierOptions().then(setTierOptions).catch(() => {});
  }, []);

  const loadUser = () => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    api
      .getUserDetail(userId)
      .then(setUser)
      .catch((err) => {
        console.error("Failed to load user:", err);
        if (err instanceof ApiError) {
          if (err.status === 403) {
            router.push("/dashboard");
          } else if (err.status === 404) {
            toast.error("User not found");
            router.push("/admin/users");
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadUser, [userId, router]);

  const handleActivate = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await api.activateUser(userId);
      toast.success("User activated");
      loadUser();
    } catch (err: unknown) {
      toast.error(adminErrorMessage(err, "Failed to activate user"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    if (!confirm(`Deactivate ${user.email}? They will not be able to log in.`)) return;

    setActionLoading(true);
    try {
      await api.deactivateUser(userId);
      toast.success("User deactivated");
      loadUser();
    } catch (err: unknown) {
      toast.error(adminErrorMessage(err, "Failed to deactivate user"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyPrefix: string) => {
    if (!confirm(`Revoke API key ${keyPrefix}...?`)) return;

    try {
      await api.revokeUserApiKey(userId, keyId);
      toast.success("API key revoked");
      loadUser();
    } catch (err: unknown) {
      toast.error(adminErrorMessage(err, "Failed to revoke key"));
    }
  };

  const handleUpdateTier = async (tierSlug: string) => {
    if (!user || !tierSlug) return;
    setTierSaving(true);
    try {
      const result = await api.updateUserTier(userId, tierSlug);
      toast.success(result.message);
      loadUser();
    } catch (err: unknown) {
      toast.error(adminErrorMessage(err, "Failed to update tier"));
    } finally {
      setTierSaving(false);
    }
  };

  const handleUpdateQuota = async (quotaLimit: number) => {
    if (!user) return;
    if (!Number.isFinite(quotaLimit) || quotaLimit < 0) {
      toast.error("Quota limit must be 0 or greater");
      return;
    }
    setQuotaSaving(true);
    try {
      const result = await api.updateUserQuota(userId, quotaLimit);
      toast.success(result.message);
      loadUser();
    } catch (err: unknown) {
      toast.error(adminErrorMessage(err, "Failed to update quota"));
    } finally {
      setQuotaSaving(false);
    }
  };

  if (loading) {
    return <UserDetailSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 px-8 py-6 text-center">
          <AlertTriangle className="mx-auto mb-2 size-6 text-rose-500" />
          <p className="font-semibold text-foreground">User not found</p>
        </div>
      </div>
    );
  }

  const initials = getInitials(user.email, user.full_name);
  const isAdmin = user.role === "super_admin";

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        onClick={() => router.push("/admin/users")}
        className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to Users
      </button>

      {/* HERO USER CARD */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-md sm:p-8",
          isAdmin
            ? "border-amber-500/40 from-amber-500/15 via-fuchsia-500/10 to-indigo-500/15"
            : "border-border/60 from-indigo-500/10 via-fuchsia-500/8 to-amber-500/10"
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 size-72 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative">
              <div
                className={cn(
                  "flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br text-2xl font-extrabold text-white shadow-xl",
                  isAdmin
                    ? "from-amber-500 via-fuchsia-500 to-indigo-500 shadow-fuchsia-500/40"
                    : "from-indigo-500 via-fuchsia-500 to-amber-500 shadow-fuchsia-500/30"
                )}
              >
                {initials}
              </div>
              {user.is_active && (
                <div className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md">
                  <CheckCircle className="size-3.5 text-white" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
                  {user.email}
                </h1>
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
                    <XCircle className="size-3" />
                    Inactive
                  </span>
                )}
              </div>

              {user.full_name && (
                <p className="text-base font-medium text-muted-foreground">
                  {user.full_name}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="size-3" />
                  <code className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px]">
                    {user.id}
                  </code>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
                {user.platform_account_id && (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="size-3 text-cyan-500" />
                    Platform ID{" "}
                    <code className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px]">
                      {user.platform_account_id}
                    </code>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap gap-2">
            {user.is_active ? (
              <Button
                onClick={handleDeactivate}
                disabled={actionLoading || isAdmin}
                className="gap-2 rounded-full border-2 border-rose-500/40 bg-rose-500/10 text-rose-700 shadow-sm hover:bg-rose-500/15 dark:text-rose-300"
                variant="outline"
              >
                {actionLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Deactivate
              </Button>
            ) : (
              <Button
                onClick={handleActivate}
                disabled={actionLoading}
                className="gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 hover:scale-[1.02]"
              >
                {actionLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
                Activate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="rounded-2xl border border-border/60 bg-card/60 p-1 backdrop-blur">
          <TabsTrigger
            value="overview"
            className="gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold data-active:bg-gradient-to-r data-active:from-indigo-500/15 data-active:via-fuchsia-500/15 data-active:to-amber-500/15 data-active:text-foreground data-active:ring-1 data-active:ring-fuchsia-500/30"
          >
            <UserIcon className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="api-keys"
            className="gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold data-active:bg-gradient-to-r data-active:from-indigo-500/15 data-active:via-fuchsia-500/15 data-active:to-amber-500/15 data-active:text-foreground data-active:ring-1 data-active:ring-fuchsia-500/30"
          >
            <Key className="size-4" />
            API Keys
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-bold text-muted-foreground">
              {user.api_keys.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold data-active:bg-gradient-to-r data-active:from-indigo-500/15 data-active:via-fuchsia-500/15 data-active:to-amber-500/15 data-active:text-foreground data-active:ring-1 data-active:ring-fuchsia-500/30"
          >
            <Activity className="size-4" />
            Recent Jobs
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-bold text-muted-foreground">
              {user.recent_jobs.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ============ OVERVIEW TAB ============ */}
        <TabsContent value="overview" className="space-y-5">
          {/* Usage stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              icon={Activity}
              label="Jobs this month"
              value={user.usage_stats.jobs_this_month.toLocaleString()}
              accent="indigo"
            />
            <StatTile
              icon={FileText}
              label="Pages this month"
              value={user.usage_stats.pages_this_month.toLocaleString()}
              accent="fuchsia"
            />
            <StatTile
              icon={Timer}
              label="Compute seconds"
              value={Math.round(user.usage_stats.total_compute_seconds).toLocaleString()}
              accent="cyan"
              suffix="s"
            />
          </div>

          {/* Subscription */}
          <Panel
            icon={Sparkles}
            title="Subscription"
            subtitle="Active plan & quota"
            accent="fuchsia"
          >
            {user.subscription ? (
              <SubscriptionPanel
                sub={user.subscription}
                tierOptions={tierOptions}
                onChangeTier={handleUpdateTier}
                onUpdateQuota={handleUpdateQuota}
                tierSaving={tierSaving}
                quotaSaving={quotaSaving}
              />
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No subscription profile"
                subtitle="This user hasn't been linked to a subscription yet."
              />
            )}
          </Panel>
        </TabsContent>

        {/* ============ API KEYS TAB ============ */}
        <TabsContent value="api-keys">
          <Panel
            icon={Key}
            title="API Keys"
            subtitle={`${user.api_keys.length} total · ${user.api_keys.filter((k) => k.is_active).length} active`}
            accent="indigo"
          >
            {user.api_keys.length === 0 ? (
              <EmptyState
                icon={Key}
                title="No API keys"
                subtitle="The user hasn't generated any API keys yet."
              />
            ) : (
              <div className="space-y-3">
                {user.api_keys.map((key) => (
                  <ApiKeyRow
                    key={key.id}
                    apiKey={key}
                    onRevoke={() => handleRevokeKey(key.id, key.key_prefix)}
                  />
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ============ JOBS TAB ============ */}
        <TabsContent value="jobs">
          <Panel
            icon={Activity}
            title="Recent Jobs"
            subtitle="Last 20 OCR jobs"
            accent="cyan"
          >
            {user.recent_jobs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No jobs yet"
                subtitle="This user hasn't run any OCR jobs."
              />
            ) : (
              <div className="space-y-3">
                {user.recent_jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =============== COMPONENTS =============== */

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: Accent;
  suffix?: string;
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
      <div className="pointer-events-none absolute -right-8 -top-8 size-20 rounded-full bg-white/20 blur-2xl dark:bg-white/5" />
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
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "bg-gradient-to-br bg-clip-text text-3xl font-extrabold tracking-tight text-transparent",
              c.valueGradient
            )}
          >
            {value}
          </span>
          {suffix && (
            <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({
  children,
  icon: Icon,
  title,
  subtitle,
  accent,
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent: Accent;
}) {
  const c = PALETTE[accent];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 shadow-md backdrop-blur sm:p-6">
      <div className="mb-5 flex items-center gap-3">
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
      {children}
    </div>
  );
}

function SubscriptionPanel({
  sub,
  tierOptions,
  onChangeTier,
  onUpdateQuota,
  tierSaving,
  quotaSaving,
}: {
  sub: NonNullable<AdminUserDetail["subscription"]>;
  tierOptions: TierOption[];
  onChangeTier: (slug: string) => Promise<void>;
  onUpdateQuota: (limit: number) => Promise<void>;
  tierSaving: boolean;
  quotaSaving: boolean;
}) {
  const [selectedTier, setSelectedTier] = useState(sub.tier_slug ?? "");
  const [quotaInput, setQuotaInput] = useState(String(sub.quota_limit));

  useEffect(() => {
    setSelectedTier(sub.tier_slug ?? "");
    setQuotaInput(String(sub.quota_limit));
  }, [sub.tier_slug, sub.quota_limit]);

  const quotaPct = Math.min(
    100,
    (sub.quota_used / Math.max(1, sub.quota_limit)) * 100
  );
  const quotaTone =
    quotaPct >= 90
      ? PALETTE.rose
      : quotaPct >= 70
        ? PALETTE.amber
        : PALETTE.emerald;

  const statusAcc: Accent =
    sub.status === "active"
      ? "emerald"
      : sub.status === "trialing"
        ? "cyan"
        : sub.status === "past_due"
          ? "amber"
          : sub.status === "canceled" || sub.status === "incomplete_expired"
            ? "rose"
            : "indigo";
  const statusC = PALETTE[statusAcc];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          icon={Sparkles}
          label="Tier"
          accent="fuchsia"
          value={
            <div>
              <div className="text-lg font-extrabold text-foreground">
                {sub.tier_name || "No tier"}
              </div>
              {sub.tier_slug && (
                <code className="mt-0.5 inline-block rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {sub.tier_slug}
                </code>
              )}
            </div>
          }
        />

        <Field
          icon={Activity}
          label="Status"
          accent={statusAcc}
          value={
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold capitalize",
                statusC.text
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full bg-gradient-to-br",
                  statusC.bar
                )}
              />
              {sub.status}
            </div>
          }
        />
      </div>

      {/* Quota bar */}
      <div className="rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-white shadow-md",
                quotaTone.iconBg
              )}
            >
              <FileText className="size-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Pages Quota
              </div>
              <div className="text-sm font-bold text-foreground">
                {sub.quota_used.toLocaleString()} of{" "}
                {sub.quota_limit.toLocaleString()}
              </div>
            </div>
          </div>
          <div
            className={cn(
              "bg-gradient-to-br bg-clip-text text-2xl font-extrabold text-transparent tabular-nums",
              quotaTone.valueGradient
            )}
          >
            {quotaPct.toFixed(0)}%
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r shadow-sm transition-all duration-700",
              quotaTone.bar
            )}
            style={{ width: `${Math.max(2, quotaPct)}%` }}
          />
        </div>
      </div>

      {/* Admin actions */}
      <div className="rounded-2xl border border-border/60 bg-background/50 p-4 backdrop-blur">
        <div className="mb-3 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Admin actions
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="admin-tier"
              className="text-xs font-bold uppercase tracking-wider text-foreground/80"
            >
              Change tier
            </label>
            <div className="flex gap-2">
              <select
                id="admin-tier"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="h-11 flex-1 rounded-xl border-2 border-border/60 bg-background px-3 text-sm font-medium shadow-sm focus:border-fuchsia-500/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              >
                <option value="">Select tier…</option>
                {tierOptions.map((tier) => (
                  <option key={tier.slug} value={tier.slug}>
                    {tier.name} ({tier.slug})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={
                  tierSaving ||
                  !selectedTier ||
                  selectedTier === (sub.tier_slug ?? "")
                }
                onClick={() => onChangeTier(selectedTier)}
                className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-500 px-4 text-white shadow-md shadow-fuchsia-500/30 hover:scale-[1.01] disabled:opacity-60"
              >
                {tierSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Updates local tier and resets quota limit to the tier default. Does
              not sync Stripe.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="admin-quota"
              className="text-xs font-bold uppercase tracking-wider text-foreground/80"
            >
              Quota limit (pages)
            </label>
            <div className="flex gap-2">
              <Input
                id="admin-quota"
                type="number"
                min={0}
                value={quotaInput}
                onChange={(e) => setQuotaInput(e.target.value)}
                className="h-11 flex-1 rounded-xl border-2 border-border/60 bg-background text-sm shadow-sm focus-visible:border-fuchsia-500/60 focus-visible:ring-2 focus-visible:ring-fuchsia-500/20"
              />
              <Button
                type="button"
                disabled={
                  quotaSaving ||
                  quotaInput === "" ||
                  Number(quotaInput) === sub.quota_limit
                }
                onClick={() => onUpdateQuota(Number(quotaInput))}
                className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 text-white shadow-md shadow-cyan-500/30 hover:scale-[1.01] disabled:opacity-60"
              >
                {quotaSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sets a manual override. Does not reset pages already used this
              period.
            </p>
          </div>
        </div>
      </div>

      {sub.stripe_customer_id && (
        <Link
          href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border-2 border-indigo-500/40 bg-indigo-500/10 px-3.5 py-2 text-sm font-bold text-indigo-700 transition-all hover:scale-[1.02] hover:bg-indigo-500/15 dark:text-indigo-300"
        >
          <CreditCard className="size-4" />
          View in Stripe
          <ExternalLink className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  accent,
  value,
}: {
  icon: LucideIcon;
  label: string;
  accent: Accent;
  value: React.ReactNode;
}) {
  const c = PALETTE[accent];
  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-gradient-to-br p-4",
        c.gradient,
        c.border
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg text-white shadow-md",
            c.iconBg
          )}
        >
          <Icon className="size-4" />
        </div>
        <span
          className={cn("text-xs font-extrabold uppercase tracking-wider", c.text)}
        >
          {label}
        </span>
      </div>
      <div>{value}</div>
    </div>
  );
}

function ApiKeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: AdminUserDetail["api_keys"][number];
  onRevoke: () => void;
}) {
  const isActive = apiKey.is_active;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-2 bg-card/50 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between",
        isActive
          ? "border-border/60 hover:border-fuchsia-500/40"
          : "border-border/40 opacity-70"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
            isActive
              ? "bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 shadow-fuchsia-500/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Key className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-foreground">
            {apiKey.name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <code className="rounded bg-muted/70 px-1.5 py-0.5 font-mono">
              {apiKey.key_prefix}…
            </code>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              Created {new Date(apiKey.created_at).toLocaleDateString()}
            </span>
            {apiKey.last_used_at && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3 text-emerald-500" />
                Last used {new Date(apiKey.last_used_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {apiKey.scopes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {apiKey.scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0 font-mono text-[10px] font-bold text-cyan-700 dark:text-cyan-300"
                >
                  {scope}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="size-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            <XCircle className="size-3" />
            Revoked
          </span>
        )}
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            className="gap-1.5 rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
          >
            <Trash2 className="size-4" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: AdminUserDetail["recent_jobs"][number] }) {
  const accent = statusAccent(job.status);
  const c = PALETTE[accent];
  const StatusIcon =
    job.status === "completed"
      ? CheckCircle
      : job.status === "failed"
        ? XCircle
        : job.status === "running" || job.status === "processing"
          ? PlayCircle
          : job.status === "queued"
            ? PauseCircle
            : Zap;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 bg-card/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
        c.border
      )}
    >
      {/* Left accent */}
      <div
        className={cn(
          "absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b",
          c.bar
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
              c.iconBg
            )}
          >
            <StatusIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                  c.text
                )}
                style={{
                  background: `color-mix(in oklch, currentColor 12%, transparent)`,
                }}
              >
                {job.status}
              </span>
              <code className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                <FileText className="size-3" />
                {job.job_type}
              </code>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3 text-indigo-500" />
                <span className="font-bold tabular-nums text-foreground/80">
                  {job.pages_processed}
                </span>{" "}
                pages
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3 text-cyan-500" />
                <span className="font-bold tabular-nums text-foreground/80">
                  {job.compute_seconds.toFixed(2)}
                </span>
                s
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                {new Date(job.created_at).toLocaleString()}
              </span>
            </div>
            {job.error_message && (
              <div className="mt-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                <span className="font-bold">Error: </span>
                {job.error_message}
              </div>
            )}
          </div>
        </div>
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
      <div className="mt-1 max-w-sm text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32 rounded-full" />
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-12 w-72 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}
