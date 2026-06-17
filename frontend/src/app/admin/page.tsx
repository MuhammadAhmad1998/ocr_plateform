"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, TrendingUp, Users, Zap, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api";
import type { PlatformStats } from "@/lib/api/types";

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    api.getPlatformStats()
      .then(setStats)
      .catch((err) => {
        console.error("Failed to load platform stats:", err);
        if (err.status === 403) {
          router.push("/dashboard");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground">Monitor system-wide statistics and usage</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Failed to load platform stats</p>
      </div>
    );
  }

  const tierData = Object.entries(stats.users_by_tier).map(([slug, data]) => ({
    slug,
    ...data,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground">Monitor system-wide statistics and usage</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_users} active · {stats.inactive_users} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signups_last_7_days}</div>
            <p className="text-xs text-muted-foreground">New signups (7 days)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jobs (24h)</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs_last_24h}</div>
            <p className="text-xs text-muted-foreground">
              {stats.queued_jobs} queued · {stats.running_jobs} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pages This Month</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pages_this_month.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total pages processed</p>
          </CardContent>
        </Card>
      </div>

      {/* User Distribution */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Types</CardTitle>
            <CardDescription>Distribution by account type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Direct Users</span>
              <span className="font-semibold">{stats.direct_users}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform Users</span>
              <span className="font-semibold">{stats.platform_users}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Super Admins</span>
              <span className="font-semibold">{stats.super_admins}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users by Tier</CardTitle>
            <CardDescription>Subscription distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tierData.map((tier) => (
              <div key={tier.slug} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tier.name}</span>
                <span className="font-semibold">{tier.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      {stats.failed_jobs_24h > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              Failed Jobs
            </CardTitle>
            <CardDescription>Jobs that failed in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failed_jobs_24h}</div>
            <p className="text-sm text-muted-foreground">Investigate errors in user detail pages</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
