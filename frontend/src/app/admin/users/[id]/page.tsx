"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Key, FileText, Activity, User as UserIcon, ExternalLink, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, getToken } from "@/lib/api";
import { toast } from "sonner";
import type { AdminUserDetail } from "@/lib/api/types";

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUser = () => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    api.getUserDetail(userId)
      .then(setUser)
      .catch((err) => {
        console.error("Failed to load user:", err);
        if (err.status === 403) {
          router.push("/dashboard");
        } else if (err.status === 404) {
          toast.error("User not found");
          router.push("/admin/users");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to activate user");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate user");
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
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke key");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Users
        </Button>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/users")}>
        <ArrowLeft className="mr-2 size-4" />
        Back to Users
      </Button>

      {/* User Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="size-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">{user.email}</CardTitle>
                  {!user.is_active && <Badge variant="secondary">Inactive</Badge>}
                  {user.role === "super_admin" && <Badge variant="default">Super Admin</Badge>}
                  {user.is_platform_user && <Badge variant="outline">Platform User</Badge>}
                </div>
                {user.full_name && <CardDescription>{user.full_name}</CardDescription>}
                <p className="text-sm text-muted-foreground">
                  User ID: {user.id} · Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {user.is_active ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeactivate}
                  disabled={actionLoading || user.role === "super_admin"}
                >
                  <XCircle className="mr-2 size-4" />
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActivate}
                  disabled={actionLoading}
                >
                  <CheckCircle className="mr-2 size-4" />
                  Activate
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.subscription ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Tier</p>
                      <p className="font-semibold">
                        {user.subscription.tier_name || "No tier"}
                        {user.subscription.tier_slug && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            ({user.subscription.tier_slug})
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{user.subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quota</p>
                      <p className="font-semibold">
                        {user.subscription.quota_used.toLocaleString()} /{" "}
                        {user.subscription.quota_limit.toLocaleString()} pages
                      </p>
                    </div>
                    {user.subscription.stripe_customer_id && (
                      <div>
                        <p className="text-sm text-muted-foreground">Stripe Customer</p>
                        <Link
                          href={`https://dashboard.stripe.com/customers/${user.subscription.stripe_customer_id}`}
                          target="_blank"
                          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          View in Stripe
                          <ExternalLink className="size-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No subscription profile</p>
              )}
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Jobs This Month</p>
                  <p className="text-2xl font-bold">{user.usage_stats.jobs_this_month}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pages This Month</p>
                  <p className="text-2xl font-bold">
                    {user.usage_stats.pages_this_month.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Compute Seconds</p>
                  <p className="text-2xl font-bold">
                    {Math.round(user.usage_stats.total_compute_seconds)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>{user.api_keys.length} total keys</CardDescription>
            </CardHeader>
            <CardContent>
              {user.api_keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys</p>
              ) : (
                <div className="space-y-3">
                  {user.api_keys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {key.key_prefix}... · Created {new Date(key.created_at).toLocaleDateString()}
                            {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? "Active" : "Revoked"}
                        </Badge>
                        {key.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeKey(key.id, key.key_prefix)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Jobs</CardTitle>
              <CardDescription>Last 20 OCR jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {user.recent_jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs found</p>
              ) : (
                <div className="space-y-3">
                  {user.recent_jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{job.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.job_type} · {job.pages_processed} pages · {job.compute_seconds.toFixed(2)}s
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(job.created_at).toLocaleString()}
                          </p>
                          {job.error_message && (
                            <p className="mt-1 text-xs text-destructive">{job.error_message}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "default"
                            : job.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
