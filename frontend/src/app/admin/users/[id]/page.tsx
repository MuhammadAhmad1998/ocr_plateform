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
import { rh, iconBox } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

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
        <div className={cn(rh.card, "rounded-3xl px-8 py-6 text-center")}>
          <AlertTriangle className="mx-auto mb-2 size-6 text-destructive" />
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
        className={cn(rh.badge, "group gap-1.5 hover:text-foreground")}
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to Users
      </button>

      {/* HERO USER CARD */}
      <div className={cn(rh.card, "p-6 sm:p-8")}>
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row">
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className={cn(iconBox("lg"), "text-2xl font-extrabold")}>
                {initials}
              </div>
              {user.is_active && (
                <div className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-foreground">
                  <CheckCircle className="size-3.5 text-primary-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={cn(rh.h1, "text-foreground sm:text-3xl")}>
                  {user.email}
                </h1>
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
                    <Globe className="size-3 text-primary" />
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
                className="gap-2"
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
                className="gap-2"
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
        <TabsList className={cn(rh.card, "p-1")}>
          <TabsTrigger
            value="overview"
            className="gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold data-active:bg-muted data-active:text-foreground"
          >
            <UserIcon className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="api-keys"
            className="gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold data-active:bg-muted data-active:text-foreground"
          >
            <Key className="size-4" />
            API Keys
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0 text-[10px] font-bold text-muted-foreground">
              {user.api_keys.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold data-active:bg-muted data-active:text-foreground"
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
            />
            <StatTile
              icon={FileText}
              label="Pages this month"
              value={user.usage_stats.pages_this_month.toLocaleString()}
            />
            <StatTile
              icon={Timer}
              label="Compute seconds"
              value={Math.round(user.usage_stats.total_compute_seconds).toLocaleString()}
              suffix="s"
            />
          </div>

          {/* Subscription */}
          <Panel
            icon={Sparkles}
            title="Subscription"
            subtitle="Active plan & quota"
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
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
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
        <div className="flex items-baseline gap-1">
          <span className={rh.statValue}>{value}</span>
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
}: {
  children: React.ReactNode;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={cn(rh.card, "p-5 sm:p-6")}>
      <div className="mb-5 flex items-center gap-3">
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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          icon={Sparkles}
          label="Tier"
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
          value={
            <span className={cn(rh.badge, "capitalize normal-case tracking-normal")}>
              <span className="size-2 rounded-full bg-foreground" />
              {sub.status}
            </span>
          }
        />
      </div>

      <div className={cn(rh.card, "p-4")}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={iconBox("sm")}>
              <FileText className="size-4" />
            </div>
            <div>
              <div className={rh.label}>Pages Quota</div>
              <div className="text-sm font-bold text-foreground">
                {sub.quota_used.toLocaleString()} of{" "}
                {sub.quota_limit.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {quotaPct.toFixed(0)}%
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-700"
            style={{ width: `${Math.max(2, quotaPct)}%` }}
          />
        </div>
      </div>

      <div className={cn(rh.card, "p-4")}>
        <div className={cn(rh.label, "mb-3")}>Admin actions</div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="admin-tier" className={rh.label}>
              Change tier
            </label>
            <div className="flex gap-2">
              <select
                id="admin-tier"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="h-11 shrink-0 px-4 disabled:opacity-60"
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
            <label htmlFor="admin-quota" className={rh.label}>
              Quota limit (pages)
            </label>
            <div className="flex gap-2">
              <Input
                id="admin-quota"
                type="number"
                min={0}
                value={quotaInput}
                onChange={(e) => setQuotaInput(e.target.value)}
                className="h-11 flex-1 rounded-xl border border-border bg-background text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="button"
                disabled={
                  quotaSaving ||
                  quotaInput === "" ||
                  Number(quotaInput) === sub.quota_limit
                }
                onClick={() => onUpdateQuota(Number(quotaInput))}
                className="h-11 shrink-0 px-4 disabled:opacity-60"
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
          className={cn(rh.badge, "group gap-2 px-3.5 py-2 text-sm hover:text-foreground")}
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
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={cn(rh.card, "p-4")}>
      <div className="mb-2 flex items-center gap-2">
        <div className={iconBox("sm")}>
          <Icon className="size-4" />
        </div>
        <span className={rh.label}>{label}</span>
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
        rh.cardHover,
        "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between",
        !isActive && "opacity-70"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={iconBox("md")}>
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
                <Clock className="size-3" />
                Last used {new Date(apiKey.last_used_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {apiKey.scopes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {apiKey.scopes.map((scope) => (
                <span key={scope} className={cn(rh.badge, "px-1.5 py-0 font-mono normal-case tracking-normal")}>
                  {scope}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn(rh.badge, "gap-1 px-2.5 py-0.5 normal-case tracking-normal")}>
          {isActive ? (
            <>
              <CheckCircle className="size-3" />
              Active
            </>
          ) : (
            <>
              <XCircle className="size-3" />
              Revoked
            </>
          )}
        </span>
        {isActive && (
          <Button variant="ghost" size="sm" onClick={onRevoke} className="gap-1.5">
            <Trash2 className="size-4" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: AdminUserDetail["recent_jobs"][number] }) {
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
    <div className={cn(rh.cardHover, "relative p-4 pl-5")}>
      <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-foreground/30" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={iconBox("md")}>
            <StatusIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(rh.badge, "px-2 py-0.5 normal-case tracking-normal")}>
                {job.status}
              </span>
              <code className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                <FileText className="size-3" />
                {job.job_type}
              </code>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3" />
                <span className="font-bold tabular-nums text-foreground/80">
                  {job.pages_processed}
                </span>{" "}
                pages
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3" />
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
              <div className="mt-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-foreground">
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center">
      <div className={cn(iconBox("lg"), "mb-3")}>
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
      <Skeleton className="h-44 w-full rounded-[20px]" />
      <Skeleton className="h-12 w-72 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-[20px]" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-[20px]" />
    </div>
  );
}
