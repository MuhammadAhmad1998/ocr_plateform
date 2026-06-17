"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getToken } from "@/lib/api";
import type { AdminUser } from "@/lib/api/types";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    api.listUsers({ page, page_size: 20, search: search || undefined })
      .then((data) => {
        setUsers(data.users);
        setTotalPages(data.total_pages);
        setTotal(data.total);
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        if (err.status === 403) {
          router.push("/dashboard");
        }
      })
      .finally(() => setLoading(false));
  }, [router, page, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage all platform users · {total} total
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <UserIcon className="size-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{user.email}</p>
                          {!user.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {user.role === "super_admin" && (
                            <Badge variant="default">Super Admin</Badge>
                          )}
                          {user.is_platform_user && (
                            <Badge variant="outline">Platform</Badge>
                          )}
                        </div>
                        {user.full_name && (
                          <p className="text-sm text-muted-foreground">{user.full_name}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {user.tier && (
                            <span>
                              {user.tier.name} · {user.tier.quota_used}/{user.tier.quota_limit} pages
                            </span>
                          )}
                          <span>{user.jobs_this_month} jobs this month</span>
                          <span>{user.api_key_count} API keys</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>Joined {new Date(user.created_at).toLocaleDateString()}</p>
                      {user.last_active && (
                        <p>Active {new Date(user.last_active).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
