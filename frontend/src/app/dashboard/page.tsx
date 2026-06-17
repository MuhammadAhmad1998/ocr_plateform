"use client";

import { Copy, Key, Loader2, TrendingUp, Activity, Calendar, ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { api, ApiError, getToken } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<{
    quota_used: number;
    quota_limit: number;
    tier_name: string | null;
    jobs_this_month: number;
  } | null>(null);
  const [jobs, setJobs] = useState<
    Array<{ id: string; status: string; job_type: string; pages_processed: number; created_at: string }>
  >([]);
  const [apiKeys, setApiKeys] = useState<
    Array<{ id: string; name: string; key_prefix: string; is_active: boolean }>
  >([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login?next=/dashboard");
      return;
    }
    setError(null);
    Promise.allSettled([api.getUsage(), api.getJobs(), api.getApiKeys()]).then((results) => {
      const [usageResult, jobsResult, keysResult] = results;

      if (usageResult.status === "fulfilled") {
        setUsage(usageResult.value);
      }
      if (jobsResult.status === "fulfilled") {
        setJobs(jobsResult.value);
      }
      if (keysResult.status === "fulfilled") {
        setApiKeys(keysResult.value);
      }

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
    });
  }, [router]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="space-y-8 px-4 py-8 lg:px-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48 lg:col-span-2" />
          </div>
          <Skeleton className="h-96" />
        </main>
      </div>
    );
  }

  const usagePct = usage ? Math.min(100, (usage.quota_used / usage.quota_limit) * 100) : 0;
  const isNearLimit = usagePct >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      <main className="space-y-8 px-4 py-8 lg:px-8">
        <FadeIn>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor your usage, manage API keys, and track processing history
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={openBillingPortal}>
                <ExternalLink className="size-4" />
                Billing
              </Button>
              <Link href="/docs" className={buttonVariants({ variant: "outline", size: "sm" })}>
                API Docs
              </Link>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-3">
          <FadeIn delay={0.05}>
            <Card className="overflow-hidden border-border shadow-sm hover-lift">
              <CardHeader className="space-y-1 bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Monthly Usage</CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TrendingUp className="size-5 text-primary" />
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={isNearLimit ? "destructive" : "secondary"} className="text-xs">
                    {usage?.tier_name || "Starter"}
                  </Badge>
                  Plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-foreground">{usage?.quota_used || 0}</span>
                    <span className="text-sm text-muted-foreground">of {usage?.quota_limit || 50} pages</span>
                  </div>
                  <Progress 
                    value={usagePct} 
                    className={`h-3 ${isNearLimit ? '[&>div]:bg-destructive' : ''}`}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <Activity className="size-4 text-primary" />
                  <span className="font-medium text-foreground">{usage?.jobs_this_month || 0}</span>
                  <span className="text-muted-foreground">jobs this month</span>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1} className="lg:col-span-2">
            <Card className="h-full overflow-hidden border-border shadow-sm">
              <CardHeader className="space-y-1 bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">API Keys</CardTitle>
                    <CardDescription>Authenticate your integrations and services</CardDescription>
                  </div>
                  <Button variant="default" size="sm" onClick={createKey} className="gap-2 shadow-sm hover:shadow-md transition-all">
                    <Key className="size-4" />
                    Generate Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {newKey && (
                  <div className="animate-fade-in rounded-xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-primary">
                      Save this key — it won&apos;t be shown again
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-background px-4 py-3 font-mono text-xs text-foreground">
                        {newKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 hover-scale"
                        onClick={() => {
                          navigator.clipboard.writeText(newKey);
                          toast.success("Copied to clipboard");
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {apiKeys.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                    <Key className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No API keys yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Generate your first key to get started with the API</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3.5 transition-all hover:border-primary/30 hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{k.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{k.key_prefix}…</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={k.is_active ? "default" : "secondary"} className="shadow-sm">
                            {k.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {k.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={() => revokeKey(k.id)}
                              title="Revoke key"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <FadeIn delay={0.15}>
          <Card className="overflow-hidden border-border shadow-sm">
            <CardHeader className="space-y-1 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Calendar className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Job History</CardTitle>
                  <CardDescription>Recent OCR processing jobs and their status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-6 py-4">Job ID</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Pages</th>
                      <th className="px-6 py-4">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <Activity className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                          <p className="font-medium text-foreground">No jobs yet</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Run the advisor to process your first document
                          </p>
                        </td>
                      </tr>
                    ) : (
                      jobs.map((j) => (
                        <tr
                          key={j.id}
                          className="group border-b border-border/50 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-6 py-4 font-mono text-sm text-foreground">{j.id.slice(0, 12)}…</td>
                          <td className="px-6 py-4 text-sm capitalize text-muted-foreground">{j.job_type}</td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                j.status === "completed"
                                  ? "default"
                                  : j.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="shadow-sm"
                            >
                              {j.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">{j.pages_processed}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {new Date(j.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </main>
    </div>
  );
}
