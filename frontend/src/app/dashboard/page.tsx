"use client";

import { Copy, Key, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FadeIn } from "@/components/fade-in";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api";

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

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([api.getUsage(), api.getJobs(), api.getApiKeys()])
      .then(([u, j, k]) => {
        setUsage(u);
        setJobs(j);
        setApiKeys(k);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-40 lg:col-span-1" />
            <Skeleton className="h-40 lg:col-span-2" />
          </div>
        </main>
      </div>
    );
  }

  const usagePct = usage ? Math.min(100, (usage.quota_used / usage.quota_limit) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <FadeIn>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Usage, API keys, and processing history</p>
        </FadeIn>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <FadeIn delay={0.05}>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Monthly usage</CardTitle>
                <CardDescription>{usage?.tier_name || "Starter"} plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{usage?.quota_used || 0} pages used</span>
                  <span className="font-medium">{usage?.quota_limit || 50} limit</span>
                </div>
                <Progress value={usagePct} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {usage?.jobs_this_month || 0} jobs this month
                </p>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1} className="lg:col-span-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">API keys</CardTitle>
                  <CardDescription>Authenticate your integrations</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={createKey} className="gap-2">
                  <Key className="size-4" />
                  Generate key
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {newKey && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <p className="text-sm font-medium text-accent">Save this key — it won&apos;t be shown again</p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-md bg-card px-3 py-2 font-mono text-xs">
                        {newKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
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
                  <p className="text-sm text-muted-foreground">No API keys yet — generate one to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{k.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</p>
                        </div>
                        <Badge variant={k.is_active ? "default" : "secondary"}>
                          {k.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <FadeIn delay={0.15} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job history</CardTitle>
              <CardDescription>Recent OCR processing jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">ID</th>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Pages</th>
                      <th className="pb-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No jobs yet — run the advisor to process your first document.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((j) => (
                        <tr key={j.id} className="border-b border-border/50">
                          <td className="py-3 pr-4 font-mono text-xs">{j.id.slice(0, 8)}…</td>
                          <td className="py-3 pr-4 capitalize">{j.job_type}</td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={
                                j.status === "completed"
                                  ? "default"
                                  : j.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {j.status}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">{j.pages_processed}</td>
                          <td className="py-3 text-muted-foreground">
                            {new Date(j.created_at).toLocaleDateString()}
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
